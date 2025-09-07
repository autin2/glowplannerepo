// Vercel serverless function: /api/glowup-pdf
// Pretty, fillable weekly "7-Day Glow-Up" planner (US Letter by default).
// Tweaks via query params: ?theme=blush|neutral|sage|sky&size=letter|a4&title=...&subtitle=...

import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

export default async function handler(req, res) {
  try {
    const q = req.query ?? {};
    const theme = String(q.theme || "blush").toLowerCase();
    const size = String(q.size || "letter").toLowerCase();
    const title = String(q.title || "7-Day Glow-Up");
    const subtitle = String(q.subtitle || "Meals • Movement • Self-Care • Daily Win");

    // Page sizes
    const P = size === "a4" ? { w: 595, h: 842, margin: 42 } : { w: 612, h: 792, margin: 44 }; // A4 or Letter

    // Theme palette
    const PALETTES = {
      blush:  { accent: rgb(1.00,0.48,0.72), wash1: rgb(1.00,0.90,0.95), wash2: rgb(0.90,0.94,1.00), wash3: rgb(0.94,0.90,1.00), ink: rgb(0.13,0.14,0.16) },
      neutral:{ accent: rgb(0.31,0.50,0.76), wash1: rgb(0.97,0.97,0.98), wash2: rgb(0.95,0.96,0.99), wash3: rgb(0.96,0.96,0.98), ink: rgb(0.13,0.14,0.16) },
      sage:   { accent: rgb(0.40,0.64,0.53), wash1: rgb(0.92,0.98,0.95), wash2: rgb(0.88,0.95,0.92), wash3: rgb(0.94,0.98,0.96), ink: rgb(0.12,0.16,0.14) },
      sky:    { accent: rgb(0.39,0.70,0.98), wash1: rgb(0.89,0.95,1.00), wash2: rgb(0.92,0.97,1.00), wash3: rgb(0.95,0.98,1.00), ink: rgb(0.12,0.13,0.18) }
    };
    const C = PALETTES[theme] || PALETTES.blush;

    const doc = await PDFDocument.create();
    const page = doc.addPage([P.w, P.h]);
    const form = doc.getForm();

    const helv = await doc.embedFont(StandardFonts.Helvetica);
    const helvB = await doc.embedFont(StandardFonts.HelveticaBold);

    // Helpers
    const drawText = (text, x, y, size=12, font=helv, color=C.ink) => page.drawText(text, { x, y, size, font, color });
    const rect = (x, y, w, h, opts={}) => page.drawRectangle({ x, y, width:w, height:h, ...opts });
    const line = (x1,y1,x2,y2,color=rgb(0.92,0.93,0.96)) => page.drawLine({ start:{x:x1,y:y1}, end:{x:x2,y:y2}, thickness:1, color });

    // Background soft washes
    rect(-30, P.h-240, 260, 220, { color: C.wash1, opacity:.6 });
    rect(P.w-260, P.h-250, 300, 230, { color: C.wash2, opacity:.45 });
    rect(110, -8, 420, 160, { color: C.wash3, opacity:.40, rotate: degrees(-2) });

    // Card area
    const M = P.margin;
    rect(M-8, M-8, P.w-(M-8)*2, P.h-(M-8)*2, { color: rgb(1,1,1), borderColor: rgb(0.92,0.93,0.96), borderWidth: 1 });

    // Header
    const headerTop = P.h - M - 8;
    const badgeW=100, badgeH=22;
    rect(P.w/2 - badgeW/2, headerTop - badgeH, badgeW, badgeH, { color: C.accent });
    drawText("GlowPlanner", P.w/2 - badgeW/2 + 10, headerTop - badgeH + 5, 10, helvB, rgb(1,1,1));
    drawText(title, P.w/2 - helvB.widthOfTextAtSize(title, 32)/2, headerTop - badgeH - 12 - 32, 32, helvB);
    drawText(subtitle, P.w/2 - helv.widthOfTextAtSize(subtitle, 12)/2, headerTop - badgeH - 12 - 32 - 16, 12, helv, rgb(.38,.39,.44));

    // Meta row
    const metaY = headerTop - 100;
    const metaH = 38;
    const colW = (P.w - M*2 - 12) / 2;

    drawText("Week of", M, metaY + metaH + 6, 10, helvB, rgb(.45,.46,.50));
    rect(M, metaY, colW-6, metaH, { color: rgb(1,1,1), borderColor: C.wash1, borderWidth: 2 });
    const fWeek = form.createTextField("WeekOf");
    fWeek.addToPage(page, { x: M+8, y: metaY+7, width: colW-6-16, height: metaH-14 });
    fWeek.updateAppearances(helv);

    drawText("Focus", M + colW + 12, metaY + metaH + 6, 10, helvB, rgb(.45,.46,.50));
    rect(M + colW + 12, metaY, colW-6, metaH, { color: rgb(1,1,1), borderColor: C.wash2, borderWidth: 2 });
    const fFocus = form.createTextField("Focus");
    fFocus.addToPage(page, { x: M + colW + 20, y: metaY+7, width: colW-6-20, height: metaH-14 });
    fFocus.updateAppearances(helv);

    // Chips (visual)
    const chips = ["Hydration","Protein","Steps","Skin","Budget"];
    let cx = M, cy = metaY - 24;
    chips.forEach(c => {
      const fs=10, pad=8, w = helvB.widthOfTextAtSize(c, fs) + pad*2;
      rect(cx, cy, w, 18, { color: rgb(0.985,0.98,1), borderColor: rgb(0.94,0.92,1), borderWidth: 1 });
      drawText(c, cx+pad, cy+4, fs, helvB, rgb(0.40,0.36,0.52));
      cx += w + 6;
    });

    // Week grid
    const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const cols = ["Day","Meals","Movement","Self-Care","Daily Win"];
    const gridTop = cy - 12;
    const gridW = P.w - M*2;
    const dayCol = 76;
    const otherW = gridW - dayCol;
    const colWArr = [dayCol, otherW/4, otherW/4, otherW/4, otherW/4];
    const rowH = 74;

    // Header row
    let gx = M, ghY = gridTop - 26;
    rect(M, ghY, gridW, 26, { color: rgb(1,1,1) });
    cols.forEach((label, i) => {
      drawText(label, gx + 8, ghY + 7, 10, helvB, rgb(.35,.36,.40));
      if (i < cols.length - 1) line(gx + colWArr[i], ghY, gx + colWArr[i], ghY + 26);
      gx += colWArr[i];
    });
    line(M, ghY, M, ghY - rowH*7);
    line(M + gridW, ghY, M + gridW, ghY - rowH*7);

    // Body rows
    for (let r = 0; r < 7; r++) {
      const y = ghY - rowH*(r+1);
      rect(M, y, gridW, rowH, { color: r%2===0 ? rgb(1,1,1) : rgb(1,0.995,0.995) });
      line(M, y, M + gridW, y);

      let x = M;
      // Day label
      drawText(days[r], x + 10, y + rowH/2 - 6, 12, helvB, rgb(.22,.24,.29));
      x += colWArr[0];
      line(x, y, x, y + rowH);

      // 4 fillable cells
      const fields = ["Meals","Movement","SelfCare","Win"];
      for (let c = 1; c <= 4; c++) {
        const fx = x + 6, fy = y + 8, fw = colWArr[c] - 12, fh = rowH - 16;
        rect(fx, fy, fw, fh, { color: rgb(1,1,1), borderColor: rgb(0.94,0.94,0.98), borderWidth: 1 });
        const tf = form.createTextField(`${fields[c-1]}_${days[r]}`);
        tf.addToPage(page, { x: fx+5, y: fy+5, width: fw-10, height: fh-10 });
        tf.enableMultiline();
        tf.setFontSize(10);
        tf.updateAppearances(helv);
        x += colWArr[c];
        if (c < 4) line(x, y, x, y + rowH);
      }
    }

    // Habits
    const habitsTop = ghY - rowH*7 - 16;
    drawText("Habit Tracker", M, habitsTop + 16, 12, helvB, rgb(.22,.24,.29));

    const habitRowH = 34, box = 14, gap = 8;
    const habits = [
      { label: "Water (8)", count: 8, tint: C.wash1 },
      { label: "Sleep (7)", count: 7, tint: C.wash3 },
      { label: "Steps / Move (7)", count: 7, tint: C.wash2 },
      { label: "Screen-off (7)", count: 7, tint: rgb(1,0.98,0.99) }
    ];

    let hy = habitsTop - 10 - habitRowH;
    habits.forEach((h, i) => {
      rect(M, hy, P.w - M*2, habitRowH, { color: rgb(1,1,1), borderColor: rgb(0.93,0.94,0.97), borderWidth: 1 });
      drawText(h.label, M + 10, hy + habitRowH/2 - 5, 10, helv, rgb(.40,.41,.46));
      let hx = M + 150;
      for (let j = 1; j <= h.count; j++) {
        rect(hx, hy + habitRowH/2 - box/2, box, box, { color: h.tint, borderColor: rgb(1,1,1), borderWidth: 1 });
        const cb = form.createCheckBox(`Habit_${i+1}_${j}`);
        cb.addToPage(page, { x: hx, y: hy + habitRowH/2 - box/2, width: box, height: box });
        hx += box + gap;
      }
      hy -= habitRowH + 8;
    });

    // Notes
    const notesH = 120;
    const notesY = hy - 8 - notesH;
    drawText("Notes & Reflections", M, notesY + notesH + 6, 12, helvB, rgb(.22,.24,.29));
    rect(M, notesY, P.w - M*2, notesH, { color: rgb(1,1,1), borderColor: rgb(0.93,0.94,0.97), borderWidth: 1 });
    const notes = form.createTextField("Notes");
    notes.enableMultiline();
    notes.addToPage(page, { x: M+8, y: notesY+8, width: P.w - M*2 - 16, height: notesH - 16 });
    notes.setFontSize(11);
    notes.updateAppearances(helv);

    // Footer tips
    const tipY = notesY - 22;
    const tips = [
      "Tip: Fill dinners first, then lunches with leftovers.",
      "Tip: Pair a 10-min tidy with your evening routine.",
      "Tip: Celebrate the smallest win each day."
    ];
    let tx = M;
    tips.forEach(t => {
      const w = helv.widthOfTextAtSize(t, 10) + 16;
      rect(tx, tipY, w, 18, { color: rgb(1,1,1), borderColor: C.wash1, borderWidth: 1 });
      drawText(t, tx + 8, tipY + 4, 10, helv, rgb(.40,.41,.46));
      tx += w + 8;
    });

    const pdf = await doc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="7-day-glow-up.pdf"');
    return res.status(200).send(Buffer.from(pdf));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to generate PDF" });
  }
}
