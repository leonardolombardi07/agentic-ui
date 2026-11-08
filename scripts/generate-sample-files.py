"""Generates the sample PDF / Excel / Word files seeded into agentic-ui's sessions.

Usage: python gen_samples.py <output dir>
"""

import sys
from datetime import date
from pathlib import Path

from docx import Document
from docx.shared import Pt, RGBColor
from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.formatting.rule import ColorScaleRule, DataBarRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics.shapes import Drawing, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

SEGMENTS = ["Cloud", "Services", "Hardware", "Licensing"]
Q3_2025 = [412, 233, 301, 118]
Q3_2026 = [498, 262, 303, 126]
MONTHS = ["Jul", "Aug", "Sep"]
# Monthly split of Q3 2026 revenue, per segment ($M).
MONTHLY = {
    "Cloud": [158, 164, 176],
    "Services": [85, 87, 90],
    "Hardware": [96, 99, 108],
    "Licensing": [41, 42, 43],
}

NAVY = "1F3864"
thin = Side(style="thin", color="BFBFBF")
box = Border(left=thin, right=thin, top=thin, bottom=thin)


# --------------------------------------------------------------------------- xlsx
def q3_financials():
    wb = Workbook()

    s = wb.active
    s.title = "Summary"
    s.sheet_properties.tabColor = NAVY
    s.merge_cells("A1:E1")
    s["A1"] = "Q3 2026 revenue by segment"
    s["A1"].font = Font(size=14, bold=True, color="FFFFFF")
    s["A1"].fill = PatternFill("solid", fgColor=NAVY)
    s["A1"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    s.row_dimensions[1].height = 28
    s["A2"] = "All figures in $M, unaudited."
    s["A2"].font = Font(italic=True, color="7F7F7F", size=9)

    headers = ["Segment", "Q3 2025", "Q3 2026", "Change", "Share of total"]
    for c, h in enumerate(headers, 1):
        cell = s.cell(row=4, column=c, value=h)
        cell.font = Font(bold=True, color=NAVY)
        cell.fill = PatternFill("solid", fgColor="D9E1F2")
        cell.border = box
        cell.alignment = Alignment(horizontal="center" if c > 1 else "left")

    for i, seg in enumerate(SEGMENTS):
        r = 5 + i
        s.cell(row=r, column=1, value=seg).border = box
        for c, v in ((2, Q3_2025[i]), (3, Q3_2026[i])):
            cell = s.cell(row=r, column=c, value=v)
            cell.number_format = '"$"#,##0'
            cell.border = box
        ch = s.cell(row=r, column=4, value=f"=C{r}/B{r}-1")
        ch.number_format = "0.0%;[Red]-0.0%"
        ch.border = box
        sh = s.cell(row=r, column=5, value=f"=C{r}/$C$9")
        sh.number_format = "0.0%"
        sh.border = box

    s["A9"] = "Total"
    for c in range(1, 6):
        s.cell(row=9, column=c).font = Font(bold=True)
        s.cell(row=9, column=c).border = Border(top=Side(style="double", color="000000"), bottom=thin, left=thin, right=thin)
    s["B9"], s["C9"] = "=SUM(B5:B8)", "=SUM(C5:C8)"
    s["B9"].number_format = s["C9"].number_format = '"$"#,##0'
    s["D9"] = "=C9/B9-1"
    s["D9"].number_format = "0.0%"
    s["E9"] = "=SUM(E5:E8)"
    s["E9"].number_format = "0.0%"
    s.conditional_formatting.add("D5:D8", ColorScaleRule(start_type="min", start_color="FFFFFF", end_type="max", end_color="63BE7B"))
    s.conditional_formatting.add("E5:E8", DataBarRule(start_type="num", start_value=0, end_type="num", end_value=1, color="5B9BD5"))

    s["A11"] = "Gross margin"
    s["B11"] = 0.618
    s["B11"].number_format = "0.0%"
    s["A12"] = "Q4 guidance (growth)"
    s["B12"] = "9-11%"
    s["B12"].alignment = Alignment(horizontal="right")
    s["A13"] = "Buyback executed"
    s["B13"] = 120
    s["B13"].number_format = '"$"#,##0"M"'
    s["B13"].comment = Comment("$120M of the $400M authorization, executed in Q3.", "Finance")
    s["A14"] = "Source"
    s["B14"] = "Investor relations"
    s["B14"].hyperlink = "https://example.com/investors"
    s["B14"].font = Font(color="0563C1", underline="single")

    for col, w in zip("ABCDE", (22, 12, 12, 11, 15)):
        s.column_dimensions[col].width = w
    s.freeze_panes = "A5"

    m = wb.create_sheet("Monthly")
    m.sheet_properties.tabColor = "70AD47"
    m.append(["Month", *SEGMENTS, "Total"])
    for c in range(1, 7):
        cell = m.cell(row=1, column=c)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="548235")
        cell.alignment = Alignment(horizontal="center")
    for i, month in enumerate(MONTHS):
        r = 2 + i
        m.cell(row=r, column=1, value=date(2026, 7 + i, 1)).number_format = "mmm yyyy"
        for j, seg in enumerate(SEGMENTS):
            m.cell(row=r, column=2 + j, value=MONTHLY[seg][i]).number_format = "#,##0"
        m.cell(row=r, column=6, value=f"=SUM(B{r}:E{r})").number_format = "#,##0"
        if i % 2:
            for c in range(1, 7):
                m.cell(row=r, column=c).fill = PatternFill("solid", fgColor="E2EFDA")
    m.append(["Q3 total", *[f"=SUM({get_column_letter(c)}2:{get_column_letter(c)}4)" for c in range(2, 7)]])
    for c in range(1, 7):
        m.cell(row=5, column=c).font = Font(bold=True)
        m.cell(row=5, column=c).border = Border(top=Side(style="medium", color="548235"))
        if c > 1:
            m.cell(row=5, column=c).number_format = "#,##0"
    for c in range(1, 7):
        m.column_dimensions[get_column_letter(c)].width = 13
    m.freeze_panes = "B2"

    # A long sheet, to exercise scrolling and the frozen header.
    t = wb.create_sheet("Transactions")
    t.sheet_properties.tabColor = "ED7D31"
    t.append(["ID", "Date", "Segment", "Region", "Customer", "Amount ($)", "Status"])
    for c in range(1, 8):
        t.cell(row=1, column=c).font = Font(bold=True)
        t.cell(row=1, column=c).fill = PatternFill("solid", fgColor="FCE4D6")
    regions = ["NA", "EMEA", "APAC", "LATAM"]
    statuses = ["Paid", "Paid", "Paid", "Pending", "Overdue"]
    for i in range(1, 401):
        status = statuses[(i * 7) % 5]
        t.append([
            f"TX-{10000 + i}",
            date(2026, 7 + (i % 3), 1 + (i * 3) % 28),
            SEGMENTS[i % 4],
            regions[(i * 5) % 4],
            f"Customer {chr(65 + i % 26)}{i % 97:02d}",
            round(1200 + (i * 7919) % 48000 + (i % 100) / 100, 2),
            status,
        ])
        r = i + 1
        t.cell(row=r, column=2).number_format = "yyyy-mm-dd"
        t.cell(row=r, column=6).number_format = "#,##0.00"
        if status == "Overdue":
            t.cell(row=r, column=7).font = Font(color="C00000", bold=True)
    for col, w in zip("ABCDEFG", (11, 12, 11, 9, 16, 13, 10)):
        t.column_dimensions[col].width = w
    t.freeze_panes = "A2"
    t.auto_filter.ref = "A1:G401"

    wb.active = 0
    wb.save(OUT / "q3-financials.xlsx")


def budget_2027():
    wb = Workbook()
    s = wb.active
    s.title = "Budget 2027"
    s.sheet_properties.tabColor = "7030A0"
    s.sheet_view.zoomScale = 110
    s.sheet_view.showGridLines = False
    s["A1"] = "FY2027 operating budget (draft)"
    s["A1"].font = Font(size=13, bold=True)
    quarters = ["Q1", "Q2", "Q3", "Q4"]
    s.append([])
    s.append(["Line item", *quarters, "FY2027", "vs FY2026"])
    for c in range(1, 8):
        cell = s.cell(row=3, column=c)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="7030A0")
        cell.alignment = Alignment(horizontal="center", wrap_text=True)
    lines = [
        ("Revenue", [1240, 1290, 1335, 1410], 0.112),
        ("Cost of revenue", [-474, -490, -505, -530], 0.081),
        ("R&D", [-210, -214, -220, -226], 0.064),
        ("Sales & marketing", [-180, -186, -190, -200], 0.052),
        ("G&A", [-74, -74, -76, -78], 0.021),
    ]
    for i, (name, values, delta) in enumerate(lines):
        r = 4 + i
        s.cell(row=r, column=1, value=name)
        for j, v in enumerate(values):
            s.cell(row=r, column=2 + j, value=v).number_format = "#,##0;[Red](#,##0)"
        s.cell(row=r, column=6, value=f"=SUM(B{r}:E{r})").number_format = "#,##0;[Red](#,##0)"
        s.cell(row=r, column=7, value=delta).number_format = "+0.0%;-0.0%"
        for c in range(1, 8):
            s.cell(row=r, column=c).border = Border(bottom=Side(style="hair", color="A6A6A6"))
    r = 4 + len(lines)
    s.cell(row=r, column=1, value="Operating income").font = Font(bold=True)
    for c in range(2, 7):
        col = get_column_letter(c)
        cell = s.cell(row=r, column=c, value=f"=SUM({col}4:{col}{r - 1})")
        cell.number_format = "#,##0;[Red](#,##0)"
        cell.font = Font(bold=True)
        cell.fill = PatternFill("solid", fgColor="EDE3F5")
    s.cell(row=r, column=1).fill = PatternFill("solid", fgColor="EDE3F5")
    s.cell(row=r, column=7).fill = PatternFill("solid", fgColor="EDE3F5")
    s.column_dimensions["A"].width = 22
    for c in "BCDEFG":
        s.column_dimensions[c].width = 11
    s["A12"] = "Assumptions are in the Board deck outline; numbers in $M."
    s["A12"].font = Font(italic=True, color="7F7F7F", size=9)
    wb.save(OUT / "budget-2027.xlsx")


# --------------------------------------------------------------------------- pdf
def q3_report():
    styles = getSampleStyleSheet()
    body = ParagraphStyle("body", parent=styles["BodyText"], fontSize=10.5, leading=15)
    h1 = ParagraphStyle("h1", parent=styles["Title"], alignment=0, fontSize=22, textColor=colors.HexColor("#1F3864"))
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], textColor=colors.HexColor("#1F3864"))

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.grey)
        canvas.drawString(20 * mm, 12 * mm, "Q3 2026 earnings report - fictional data for agentic-ui")
        canvas.drawRightString(190 * mm, 12 * mm, f"Page {doc.page}")
        canvas.restoreState()

    story = [
        Paragraph("Q3 2026 earnings report", h1),
        Paragraph("Prepared for the board, 30 October 2026", styles["Italic"]),
        Spacer(1, 8 * mm),
        Paragraph("Summary", h2),
        Paragraph(
            "Revenue reached <b>$1.19B</b>, up 11.7% year over year. Growth came mostly from "
            "<b>Cloud</b> (+20.9%) and <b>Services</b> (+12.4%), while Hardware stayed flat. Gross margin "
            "improved to 61.8% (+1.2pp) and Q4 guidance was raised to 9-11% growth.",
            body,
        ),
        Spacer(1, 5 * mm),
    ]

    rows = [["Segment", "Q3 2025", "Q3 2026", "Change"]]
    for seg, a, b in zip(SEGMENTS, Q3_2025, Q3_2026):
        rows.append([seg, f"${a}M", f"${b}M", f"{(b / a - 1) * 100:+.1f}%"])
    rows.append(["Total", f"${sum(Q3_2025)}M", f"${sum(Q3_2026)}M", f"{(sum(Q3_2026) / sum(Q3_2025) - 1) * 100:+.1f}%"])
    table = Table(rows, colWidths=[55 * mm, 35 * mm, 35 * mm, 30 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F3864")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#EEF2F9")]),
        ("LINEABOVE", (0, -1), (-1, -1), 1, colors.HexColor("#1F3864")),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#BFBFBF")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story += [table, Spacer(1, 8 * mm), Paragraph("Revenue by segment ($M)", h2)]

    chart = Drawing(170 * mm, 70 * mm)
    bars = VerticalBarChart()
    bars.x, bars.y, bars.width, bars.height = 15 * mm, 10 * mm, 140 * mm, 52 * mm
    bars.data = [Q3_2025, Q3_2026]
    bars.categoryAxis.categoryNames = SEGMENTS
    bars.valueAxis.valueMin = 0
    bars.valueAxis.valueMax = 550
    bars.valueAxis.valueStep = 100
    bars.bars[0].fillColor = colors.HexColor("#A6B8DA")
    bars.bars[1].fillColor = colors.HexColor("#1F3864")
    bars.groupSpacing = 12
    chart.add(bars)
    chart.add(String(150 * mm, 64 * mm, "light: 2025   dark: 2026", fontSize=8, fillColor=colors.grey, textAnchor="end"))
    story += [chart, PageBreak()]

    story += [
        Paragraph("Monthly trend", h2),
        Paragraph("Each month of the quarter grew on the one before, led by Cloud in September.", body),
        Spacer(1, 4 * mm),
    ]
    trend = Drawing(170 * mm, 70 * mm)
    lines = HorizontalLineChart()
    lines.x, lines.y, lines.width, lines.height = 15 * mm, 10 * mm, 140 * mm, 52 * mm
    lines.data = [MONTHLY[s] for s in SEGMENTS]
    lines.categoryAxis.categoryNames = MONTHS
    lines.valueAxis.valueMin = 0
    lines.valueAxis.valueMax = 200
    palette = ["#1F3864", "#70AD47", "#ED7D31", "#7030A0"]
    for i, c in enumerate(palette):
        lines.lines[i].strokeColor = colors.HexColor(c)
        lines.lines[i].strokeWidth = 2
    trend.add(lines)
    story += [trend, Spacer(1, 6 * mm), Paragraph("Risks to watch", h2)]
    for risk in [
        "<b>Pricing pressure in EMEA.</b> Two large renewals moved to multi-year terms at lower rates.",
        "<b>SMB churn.</b> Logo churn rose to 2.9% a month; the self-serve onboarding fix ships in Q4.",
        "<b>Hardware supply.</b> Constraints eased in September but lead times remain above plan.",
    ]:
        story += [Paragraph(f"&bull; {risk}", body), Spacer(1, 2 * mm)]
    story += [PageBreak(), Paragraph("Appendix: methodology", h2)]
    for i in range(6):
        story += [
            Paragraph(
                "Segment revenue is recognised under the company's standard policy. Figures are rounded to the "
                "nearest million and may not add up exactly. Year-over-year changes compare against the same "
                "quarter of the previous fiscal year, restated for the reorganisation of the Services segment. "
                f"(Paragraph {i + 1} of 6, to give the viewer a third page to scroll to.)",
                body,
            ),
            Spacer(1, 3 * mm),
        ]

    doc = SimpleDocTemplate(str(OUT / "q3-earnings-report.pdf"), pagesize=A4, title="Q3 2026 earnings report",
                            author="agentic-ui seed", leftMargin=20 * mm, rightMargin=20 * mm, topMargin=20 * mm)
    doc.build(story, onFirstPage=footer, onLaterPages=footer)


def security_review_pdf():
    styles = getSampleStyleSheet()
    story = [
        Paragraph("Security review: auth middleware", styles["Title"]),
        Paragraph(
            "Scope: the token verification path in <font face='Courier'>auth-middleware.ts</font>. "
            "Findings are ranked by severity.",
            styles["BodyText"],
        ),
        Spacer(1, 6 * mm),
    ]
    rows = [["#", "Severity", "Finding", "Status"],
            ["1", "High", "Expired tokens accepted when clock skew > 5 min", "Fixed"],
            ["2", "Medium", "Error responses leak the token's subject", "Open"],
            ["3", "Low", "Missing rate limit on /auth/refresh", "Open"]]
    table = Table(rows, colWidths=[10 * mm, 22 * mm, 105 * mm, 20 * mm])
    sev = {"High": "#C00000", "Medium": "#ED7D31", "Low": "#7F7F7F"}
    style = [("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#262626")), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
             ("GRID", (0, 0), (-1, -1), 0.25, colors.grey), ("FONTSIZE", (0, 0), (-1, -1), 9)]
    for r in range(1, len(rows)):
        style.append(("TEXTCOLOR", (1, r), (1, r), colors.HexColor(sev[rows[r][1]])))
    table.setStyle(TableStyle(style))
    story.append(table)
    SimpleDocTemplate(str(OUT / "security-review.pdf"), pagesize=A4, title="Security review").build(story)


# --------------------------------------------------------------------------- docx
def board_memo():
    d = Document()
    d.add_heading("Memo to the board: Q3 results and FY2027 plan", 0)
    p = d.add_paragraph()
    p.add_run("From: ").bold = True
    p.add_run("Office of the CFO    ")
    p.add_run("Date: ").bold = True
    p.add_run("4 November 2026")
    d.add_heading("Where we are", level=1)
    d.add_paragraph(
        "Q3 revenue was $1.19B (+11.7% YoY). Cloud and Services carried the quarter; Hardware was flat. "
        "Gross margin reached 61.8%, the highest in eight quarters."
    )
    d.add_heading("What we're asking for", level=1)
    for item in ["Approve the FY2027 operating budget (attached spreadsheet).",
                 "Extend the buyback authorization by $200M.",
                 "Endorse the EMEA pricing review."]:
        d.add_paragraph(item, style="List Number")
    d.add_heading("Budget at a glance", level=2)
    t = d.add_table(rows=1, cols=3)
    t.style = "Light Grid Accent 1"
    hdr = t.rows[0].cells
    hdr[0].text, hdr[1].text, hdr[2].text = "Line item", "FY2027 ($M)", "vs FY2026"
    for name, v, delta in [("Revenue", "5,275", "+11.2%"), ("Operating income", "1,723", "+15.4%"), ("Headcount", "4,120", "+6.0%")]:
        row = t.add_row().cells
        row[0].text, row[1].text, row[2].text = name, v, delta
    d.add_heading("Risks", level=2)
    for r in ["EMEA pricing pressure", "SMB churn", "Hardware lead times"]:
        d.add_paragraph(r, style="List Bullet")
    q = d.add_paragraph()
    run = q.add_run("Confidential. Fictional data generated for agentic-ui.")
    run.italic = True
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x7F, 0x7F, 0x7F)
    d.save(OUT / "board-memo.docx")


def cache_formula_values(path):
    """openpyxl saves formulas without their results, which Excel computes on open. Previewers
    read the cached result (`<v>`), so compute it here: enough of a formula language for these
    samples (cell refs, SUM over a range, arithmetic)."""
    import re
    import zipfile

    from openpyxl import load_workbook
    from openpyxl.utils import column_index_from_string, range_boundaries

    wb = load_workbook(path)
    results = {}
    for ws in wb.worksheets:
        values = {}

        def value(ref, ws=ws, values=values):
            ref = ref.replace("$", "")
            if ref in values:
                return values[ref]
            v = ws[ref].value
            if isinstance(v, str) and v.startswith("="):
                v = evaluate(v[1:])
            values[ref] = v if isinstance(v, (int, float)) else 0
            return values[ref]

        def evaluate(formula):
            def total(m):
                c1, r1, c2, r2 = range_boundaries(m.group(1).replace("$", ""))
                return str(sum(value(f"{get_column_letter(c)}{r}") for c in range(c1, c2 + 1) for r in range(r1, r2 + 1)))
            expr = re.sub(r"SUM\(([^)]+)\)", total, formula)
            expr = re.sub(r"\$?([A-Z]{1,3})\$?(\d+)", lambda m: repr(value(m.group(1) + m.group(2))), expr)
            return eval(expr, {"__builtins__": {}})  # noqa: S307 - our own formulas only

        sheet = {}
        for row in ws.iter_rows():
            for cell in row:
                if isinstance(cell.value, str) and cell.value.startswith("="):
                    sheet[cell.coordinate] = value(cell.coordinate)
        results[ws.title] = sheet
    names = [ws.title for ws in wb.worksheets]

    with zipfile.ZipFile(path) as z:
        entries = {n: z.read(n) for n in z.namelist()}
    for i, name in enumerate(names, 1):
        key = f"xl/worksheets/sheet{i}.xml"
        xml = entries[key].decode("utf-8")
        for ref, v in results[name].items():
            xml = re.sub(rf'(<c r="{ref}"[^>]*>)(<f>[^<]*</f>)<v\s*/?>(</v>)?', lambda m: f"{m.group(1)}{m.group(2)}<v>{v!r}</v>", xml)
        entries[key] = xml.encode("utf-8")
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for n, data in entries.items():
            z.writestr(n, data)


q3_financials()
budget_2027()
cache_formula_values(OUT / "q3-financials.xlsx")
cache_formula_values(OUT / "budget-2027.xlsx")
q3_report()
security_review_pdf()
board_memo()
# Not a real workbook: shows the "This file looks damaged" screen.
(OUT / "corrupted-export.xlsx").write_bytes(b"PK\x03\x04" + b"\x00" * 26 + b"this export was cut off halfway")
for f in sorted(OUT.iterdir()):
    print(f"{f.name:28} {f.stat().st_size:>8} bytes")
