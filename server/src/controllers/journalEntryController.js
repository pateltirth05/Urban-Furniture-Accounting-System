import pool from "../config/db.js";

// CREATE JOURNAL ENTRY AS DRAFT
export const createJournalEntry = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const {
      journalId,
      entryDate,
      reference,
      partnerId,
      lines,
    } = req.body;

    if (!journalId) {
      return res.status(400).json({
        success: false,
        message: "Journal is required",
      });
    }

    if (!entryDate) {
      return res.status(400).json({
        success: false,
        message: "Entry date is required",
      });
    }

    if (!Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({
        success: false,
        message: "At least two journal lines are required",
      });
    }

    await client.query("BEGIN");

    // Validate journal
    const journalResult = await client.query(
      `SELECT id
       FROM journals
       WHERE id = $1
       AND is_active = TRUE`,
      [journalId]
    );

    if (journalResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Journal not found",
      });
    }

    // Validate partner if supplied
    if (partnerId) {
      const partnerResult = await client.query(
        `SELECT id
         FROM contacts
         WHERE id = $1
         AND is_active = TRUE`,
        [partnerId]
      );

      if (partnerResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Partner not found",
        });
      }
    }

    // Validate every line
    for (const line of lines) {
      const {
        accountId,
        linePartnerId,
        analyticAccountId,
        debit,
        credit,
      } = line;

      if (!accountId) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Account is required for every journal line",
        });
      }

      const debitAmount = Number(debit || 0);
      const creditAmount = Number(credit || 0);

      if (debitAmount < 0 || creditAmount < 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Debit and credit cannot be negative",
        });
      }

      if (
        (debitAmount > 0 && creditAmount > 0) ||
        (debitAmount === 0 && creditAmount === 0)
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message:
            "Each journal line must contain either debit or credit",
        });
      }

      // Account validation
      const accountResult = await client.query(
        `SELECT id
         FROM chart_of_accounts
         WHERE id = $1
         AND is_active = TRUE`,
        [accountId]
      );

      if (accountResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: `Account ${accountId} not found`,
        });
      }

      // Line partner validation
      if (linePartnerId) {
        const partnerResult = await client.query(
          `SELECT id
           FROM contacts
           WHERE id = $1
           AND is_active = TRUE`,
          [linePartnerId]
        );

        if (partnerResult.rows.length === 0) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            success: false,
            message: `Partner ${linePartnerId} not found`,
          });
        }
      }

      // Analytic account validation
      if (analyticAccountId) {
        const analyticResult = await client.query(
          `SELECT id
           FROM analytic_accounts
           WHERE id = $1
           AND is_active = TRUE`,
          [analyticAccountId]
        );

        if (analyticResult.rows.length === 0) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            success: false,
            message: `Analytic account ${analyticAccountId} not found`,
          });
        }
      }
    }

    // Create journal entry header
    const entryResult = await client.query(
      `INSERT INTO journal_entries
       (
         journal_id,
         entry_date,
         reference,
         partner_id,
         status
       )
       VALUES ($1, $2, $3, $4, 'DRAFT')
       RETURNING *`,
      [
        journalId,
        entryDate,
        reference || null,
        partnerId || null,
      ]
    );

    const entry = entryResult.rows[0];

    // Create journal lines
    for (const line of lines) {
      await client.query(
        `INSERT INTO journal_entry_lines
         (
           journal_entry_id,
           account_id,
           partner_id,
           analytic_account_id,
           debit,
           credit
         )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          entry.id,
          line.accountId,
          line.linePartnerId || null,
          line.analyticAccountId || null,
          Number(line.debit || 0),
          Number(line.credit || 0),
        ]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Journal entry draft created successfully",
      data: {
        ...entry,
        lines,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

// GET ALL JOURNAL ENTRIES
export const getJournalEntries = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         je.id,
         je.entry_date,
         je.reference,
         je.status,
         je.created_at,
         j.name AS journal_name,
         c.name AS partner_name,
         COALESCE(SUM(jel.debit), 0) AS total_debit,
         COALESCE(SUM(jel.credit), 0) AS total_credit
       FROM journal_entries je
       JOIN journals j
         ON je.journal_id = j.id
       LEFT JOIN contacts c
         ON je.partner_id = c.id
       LEFT JOIN journal_entry_lines jel
         ON je.id = jel.journal_entry_id
       GROUP BY
         je.id,
         je.entry_date,
         je.reference,
         je.status,
         je.created_at,
         j.name,
         c.name
       ORDER BY je.entry_date DESC, je.id DESC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// GET ONE JOURNAL ENTRY
export const getJournalEntryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const entryResult = await pool.query(
      `SELECT
         je.*,
         j.name AS journal_name,
         c.name AS partner_name
       FROM journal_entries je
       JOIN journals j
         ON je.journal_id = j.id
       LEFT JOIN contacts c
         ON je.partner_id = c.id
       WHERE je.id = $1`,
      [id]
    );

    if (entryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found",
      });
    }

    const linesResult = await pool.query(
      `SELECT
         jel.*,
         coa.name AS account_name,
         c.name AS partner_name,
         aa.name AS analytic_account_name
       FROM journal_entry_lines jel
       JOIN chart_of_accounts coa
         ON jel.account_id = coa.id
       LEFT JOIN contacts c
         ON jel.partner_id = c.id
       LEFT JOIN analytic_accounts aa
         ON jel.analytic_account_id = aa.id
       WHERE jel.journal_entry_id = $1
       ORDER BY jel.id`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: {
        ...entryResult.rows[0],
        lines: linesResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST JOURNAL ENTRY
export const postJournalEntry = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    // Lock the entry while posting
    const entryResult = await client.query(
      `SELECT *
       FROM journal_entries
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (entryResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Journal entry not found",
      });
    }

    const entry = entryResult.rows[0];

    if (entry.status !== "DRAFT") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Only draft journal entries can be posted",
      });
    }

    const linesResult = await client.query(
      `SELECT
         debit,
         credit
       FROM journal_entry_lines
       WHERE journal_entry_id = $1`,
      [id]
    );

    if (linesResult.rows.length < 2) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "A journal entry must contain at least two lines",
      });
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of linesResult.rows) {
      totalDebit += Number(line.debit);
      totalCredit += Number(line.credit);
    }

    // Floating-point tolerance
    const difference = Math.abs(totalDebit - totalCredit);

    if (difference > 0.005) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Journal entry is not balanced",
        totalDebit: totalDebit.toFixed(2),
        totalCredit: totalCredit.toFixed(2),
      });
    }

    const updateResult = await client.query(
      `UPDATE journal_entries
       SET status = 'POSTED'
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Journal entry posted successfully",
      data: {
        ...updateResult.rows[0],
        totalDebit: totalDebit.toFixed(2),
        totalCredit: totalCredit.toFixed(2),
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

// CANCEL JOURNAL ENTRY
export const cancelJournalEntry = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE journal_entries
       SET status = 'CANCELLED'
       WHERE id = $1
       AND status = 'DRAFT'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Draft journal entry not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Journal entry cancelled successfully",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};