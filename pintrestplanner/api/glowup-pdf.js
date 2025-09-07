// Vercel serverless function: /api/glowup-pdf
// Returns a styled, fillable PDF (US Letter) for the 7-Day Glow-Up planner.

import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

export default async function handler(req, res) {
  try {
    // Letter size (points): 612 x 792
    const WIDTH = 612, HEIGHT = 792;
    const M = 44; // page margin

    const doc = await PDFDocument.create();
    const page = doc.addPage([WIDTH, HEIGHT]);
    const form = doc.getForm();

    const helv = await doc.embedFont(StandardFonts.Helvetica);
    const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);

    // --- Helpers ---
    const drawText = (text, x, y, size = 12, font = helv, color = rgb(0.14, 0.14, 0.16)) => {
      page.drawText(text, { x, y, size, font, color });
    };
    const drawRect = (x, y, w, h, options = {}) => page.drawRectangle({ x, y, width: w, height: h, ...options });
    const line = (x1, y1, x2, y2, color = rgb(0.91, 0.91, 0.95)) => {
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 1, color });
    };

    // Pastel backdrop accents (soft “watercolor” feel with big translucent shapes)
    drawRect(-40, HEIGHT - 220, 280, 220, { color: rgb(1, 0.85, 0.91), opacity: 0.35 });
    drawRect(WIDTH - 260, HEIGHT - 260, 300, 240, { color: rgb(0.88, 0.92, 1), opacity: 0.30 });
    drawRect(120, -10, 420, 180, { color: rgb(0.92, 0.88, 1), opacity: 0.25, rotate: degrees(-2) });

    // Card background
    drawRect(M - 10, M - 10, WIDTH - (M - 10) * 2, HEIGHT - (M - 10) * 2, {
      color: rgb(1, 1, 1), opacity: 1, borderColor: rgb(0.93, 0.94, 0.97), borderWidth: 1
    });

    // --- Header ---
    const headerY = HEIGHT - M - 10;
    // Badge
    const badgeW = 92, badgeH = 22;
    drawRect(WIDTH/2 - badgeW/2, headerY - badgeH, badgeW, badgeH, { color: rgb(0.62, 0.78, 1) });
    drawText("GlowPlanner", WIDTH/2 - badgeW/2 + 10, headerY - badgeH + 5, 10, helvBold, rgb(1,1,1));

    // Title
    const title = "7-Day Glow-Up";
    drawText(title, WIDTH/2 - helvBold.widthOfTextAtSize(title, 30)/2, headerY - badgeH - 10 - 30, 30, helvBold);
    const sub = "Meals • Movement • Self-Care • Daily Win";
    drawText(sub, WIDTH/2 - helv.widthOfTextAtSize(sub, 12)/2, headerY - badgeH - 10 - 30 - 16, 12, helv, rgb(0.42,0.43,0.46));

    // --- Meta row: Week of / Focus (fillable lines) ---
    const metaTop = headerY - 100;
    const metaHeight = 38;
    const colW = (WIDTH - M*2 - 10) / 2;

    drawText("Week of", M, metaTop + metaHeight + 6, 10, helvBold, rgb(0.48,0.49,0.53));
    drawRect(M, metaTop, colW - 6, metaHeight, { borderColor: rgb(1,0.85,0.91), borderWidth: 2, color: rgb(1,1,1) });
    const fWeek = form.createTextField("WeekOf");
    fWeek.setText("");
    fWeek.addToPage(page, { x: M + 6, y: metaTop + 6, width: colW - 18, height: metaHeight - 12 });
    fWeek.updateAppearances(helv);

    drawText("Focus", M + colW + 6, metaTop + metaHeight + 6, 10, helvBold, rgb(0.48,0.49,0.53));
    drawRect(M + colW + 6, metaTop, colW - 6, metaHeight, { borderColor: rgb(0.94,0.92,1), borderWidth: 2, color: rgb(1,1,1) });
    const fFocus = form.createTextField("Focus");
    fFocus.addToPage(page, { x: M + colW + 12, y: metaTop + 6, width: colW - 24, height: metaHeight - 12 });
    fFocus.updateAppearances(helv);

    // --- Chips (visual only) ---
    const chips = ["Hydration","Protein","Steps","Skin","Budget"];
    let cx = M, cy = metaTop - 24;
    chips.forEach((c) => {
      const padX = 8, padY = 4, fs = 10;
      const w = helvBold.widthOfTextAtSize(c, fs) + padX*2;
      drawRect(cx, cy, w, 18, { borderColor: rgb(0.94,0.92,1), color: rgb(0.98,0.97,1), borderWidth: 1 });
      drawText(c, cx + padX, cy + 4, fs, helvBold, rgb(0.41,0.36,0.53));
      cx += w + 6;
    });

    // --- Main grid ---
    const gridTop = cy - 12;
    const rowH = 70;
    const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const cols = ["Day","Meals","Movement","Self-Care","Daily Win"];
    const dayColW = 70;
    const gridW = WIDTH - M*2;
    const otherCols = gridW - dayColW;
    const colWArr = [dayColW, otherCols/4, otherCols/4, otherCols/4, otherCols/4];

    // Header row
    let gx = M, gy = gridTop - 26;
    drawRect(M, gy, gridW, 26, { color: rgb(1,1,1) });
    // subtle gradient effect lines
    line(M, gy, M + gridW, gy, rgb(0.93,0.94,0.97));
    cols.forEach((label, i) => {
      drawText(label, gx + 8, gy + 7, 10, helvBold, rgb(0.36,0.37,0.41));
      if (i < cols.length - 1) line(gx + colWArr[i], gy, gx + colWArr[i], gy + 26, rgb(0.93,0.94,0.97));
      gx += colWArr[i];
    });
    line(M, gy, M, gy - rowH*7, rgb(0.93,0.94,0.97));
    line(M + gridW, gy, M + gridW, gy - rowH*7, rgb(0.93,0.94,0.97));

    // Body rows
    for (let r = 0; r < 7; r++) {
      const y = gy - rowH*(r+1);
      // row background stripes
      const bg = r % 2 === 0 ? rgb(1,1,1) : rgb(1, 0.99, 0.99);
      drawRect(M, y, gridW, rowH, { color: bg });

      // horizontal rule
      line(M, y, M + gridW, y, rgb(0.93,0.94,0.97));

      // cells vertical rules + labels + fields
      let x = M;

      // day label
      drawText(days[r], x + 10, y + rowH/2 - 6, 12, helvBold, rgb(0.24,0.25,0.29));
      x += colWArr[0];
      line(x, y, x, y + rowH, rgb(0.93,0.94,0.97));

      // 4 fillable cells: Meals, Movement, Self-Care, Daily Win
      const fieldNames = ["Meals","Movement","SelfCare","Win"];
      for (let c = 1; c < 5; c++) {
        const fx = x + 6, fy = y + 8, fw = colWArr[c] - 12, fh = rowH - 16;
        // subtle blank lines look: thin background lines drawn by the border below
        drawRect(fx, fy, fw, fh, { color: rgb(1,1,1), borderColor: rgb(0.94,0.94,0.98), borderWidth: 1 });

        const name = `${fieldNames[c-1]}_${days[r]}`;
        const tf = form.createTextField(name);
        tf.addToPage(page, { x: fx + 4, y: fy + 4, width: fw - 8, height: fh - 8 });
        tf.updateAppearances(helv);
        tf.setFontSize(10);
        tf.enableMultiline(); // allow multiple lines

        x += colWArr[c];
        if (c < 4) line(x, y, x, y + rowH, rgb(0.93,0.94,0.97));
      }
    }

    // --- Habit Tracker ---
    const habitsTop = gy - rowH*7 - 18;
    drawText("Habit Tracker", M, habitsTop + 16, 12, helvBold, rgb(0.24,0.25,0.29));

    const habitRowH = 36;
    const boxSize = 14;
    const gap = 8;
    const habits = [
      { label: "Water (8)", count: 8, color: rgb(1, 0.83, 0.91) },
      { label: "Sleep (7)", count: 7, color: rgb(1, 0.95, 0.97) },
      { label: "Steps / Move (7)", count: 7, color: rgb(0.98, 0.98, 1) },
      { label: "Screen-off (7)", count: 7, color: rgb(1, 0.97, 0.99) },
    ];

    let hy = habitsTop - 8 - habitRowH;
    habits.forEach((h, i) => {
      // row bg
      drawRect(M, hy, WIDTH - M*2, habitRowH, { color: rgb(1,1,1), borderColor: rgb(0.93,0.94,0.97), borderWidth: 1 });
      drawText(h.label, M + 10, hy + habitRowH/2 - 5, 10, helv, rgb(0.42,0.43,0.46));
      let hx = M + 140;
      for (let j = 1; j <= h.count; j++) {
        drawRect(hx, hy + habitRowH/2 - boxSize/2, boxSize, boxSize, { color: h.color, borderColor: rgb(1,1,1), borderWidth: 1 });
        const cb = form.createCheckBox(`Habit_${i+1}_${j}`);
        cb.addToPage(page, { x: hx, y: hy + habitRowH/2 - boxSize/2, width: boxSize, height: boxSize });
        hx += boxSize + gap;
      }
      hy -= habitRowH + 8;
    });

    // --- Notes & Reflections (multiline field) ---
    const notesH = 120;
    const notesY = hy - 6 - notesH;
    drawText("Notes & Reflections", M, notesY + notesH + 6, 12, helvBold, rgb(0.24,0.25,0.29));
    drawRect(M, notesY, WIDTH - M*2, notesH, { color: rgb(1,1,1), borderColor: rgb(0.93,0.94,0.97), borderWidth: 1 });
    const fNotes = form.createTextField("Notes");
    fNotes.enableMultiline();
    fNotes.addToPage(page, { x: M + 6, y: notesY + 6, width: WIDTH - M*2 - 12, height: notesH - 12 });
    fNotes.updateAppearances(helv);
    fNotes.setFontSize(11);

    // Footer tips
    const tipY = notesY - 24;
    const tips = [
      "Tip: Fill dinners first, then lunches with leftovers.",
      "Tip: Pair a 10-min tidy with your evening routine.",
      "Tip: Celebrate the smallest win each day."
    ];
    let tx = M;
    tips.forEach(t => {
      const w = helv.widthOfTextAtSize(t, 10) + 16;
      drawRect(tx, tipY, w, 18, { color: rgb(1,1,1), borderColor: rgb(1,0.87,0.9), borderWidth: 1 });
      drawText(t, tx + 8, tipY + 4, 10, helv, rgb(0.42,0.43,0.46));
      tx += w + 8;
    });

    // Finalize
    const pdfBytes = await doc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="7-day-glow-up.pdf"');
    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to generate PDF" });
  }
}
