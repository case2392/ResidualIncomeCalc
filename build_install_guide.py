#!/usr/bin/env python3
"""Generate the installation guide PDF for the VA Residual Income Calculator extension."""

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem,
    Table, TableStyle, PageBreak, KeepTogether
)

OUTPUT = "Install-Guide.pdf"

PRIMARY = HexColor("#006aff")
DARK = HexColor("#1f2937")
MUTED = HexColor("#6b7280")
BG = HexColor("#f3f4f6")
ACCENT_BG = HexColor("#fffbeb")
ACCENT_BORDER = HexColor("#f59e0b")

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "Title", parent=styles["Title"],
    fontName="Helvetica-Bold", fontSize=22, leading=26,
    textColor=DARK, spaceAfter=4, alignment=TA_LEFT,
)
subtitle_style = ParagraphStyle(
    "Subtitle", parent=styles["Normal"],
    fontName="Helvetica", fontSize=12, leading=16,
    textColor=MUTED, spaceAfter=18, alignment=TA_LEFT,
)
h1_style = ParagraphStyle(
    "H1", parent=styles["Heading1"],
    fontName="Helvetica-Bold", fontSize=16, leading=20,
    textColor=PRIMARY, spaceBefore=18, spaceAfter=8,
)
h2_style = ParagraphStyle(
    "H2", parent=styles["Heading2"],
    fontName="Helvetica-Bold", fontSize=13, leading=17,
    textColor=DARK, spaceBefore=12, spaceAfter=6,
)
body_style = ParagraphStyle(
    "Body", parent=styles["Normal"],
    fontName="Helvetica", fontSize=11, leading=15,
    textColor=DARK, spaceAfter=6,
)
mono_style = ParagraphStyle(
    "Mono", parent=styles["Normal"],
    fontName="Courier", fontSize=10, leading=14,
    textColor=DARK, leftIndent=12, spaceAfter=6,
    backColor=BG, borderPadding=(6, 8, 6, 8),
)
note_style = ParagraphStyle(
    "Note", parent=styles["Normal"],
    fontName="Helvetica", fontSize=10, leading=14,
    textColor=DARK, spaceAfter=6,
    backColor=ACCENT_BG,
    borderColor=ACCENT_BORDER, borderWidth=0,
    borderPadding=(8, 10, 8, 10),
    leftIndent=0, rightIndent=0,
)
list_item_style = ParagraphStyle(
    "ListItem", parent=body_style,
    fontName="Helvetica", fontSize=11, leading=16,
    spaceAfter=4,
)


def numbered(items):
    return ListFlowable(
        [ListItem(Paragraph(t, list_item_style), leftIndent=18) for t in items],
        bulletType="1", bulletFontName="Helvetica-Bold",
        bulletFontSize=11, leftIndent=22, bulletDedent=14,
    )


def bulleted(items):
    return ListFlowable(
        [ListItem(Paragraph(t, list_item_style), leftIndent=18) for t in items],
        bulletType="bullet", bulletFontName="Helvetica",
        bulletFontSize=11, leftIndent=22, bulletDedent=14,
    )


def header_band(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(PRIMARY)
    canvas.rect(0, LETTER[1] - 0.5 * inch, LETTER[0], 0.5 * inch, fill=1, stroke=0)
    canvas.setFillColor(white)
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(0.75 * inch, LETTER[1] - 0.32 * inch,
                      "VA Residual Income Calculator  -  Installation Guide")
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(LETTER[0] - 0.75 * inch, LETTER[1] - 0.32 * inch,
                           "Chrome Extension")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 9)
    canvas.drawCentredString(LETTER[0] / 2, 0.4 * inch,
                             f"Page {doc.page}")
    canvas.restoreState()


def build():
    doc = SimpleDocTemplate(
        OUTPUT, pagesize=LETTER,
        leftMargin=0.75 * inch, rightMargin=0.75 * inch,
        topMargin=0.85 * inch, bottomMargin=0.7 * inch,
        title="VA Residual Income Calculator - Install Guide",
        author="ResidualIncomeCalc",
    )

    flow = []

    flow.append(Paragraph("VA Residual Income Calculator", title_style))
    flow.append(Paragraph("How to install this Chrome extension on your computer", subtitle_style))

    flow.append(Paragraph("What this extension does", h1_style))
    flow.append(Paragraph(
        "Once installed, the extension adds a <b>Run Residual Income Calc</b> button to the "
        "Zillow Home Loans operator portal next to the <i>Military service completed</i> "
        "checkbox. The button only appears when Veteran type is set to <i>Regular military</i> "
        "or <i>National Guard or reserves</i>. Clicking it reads income, debts, PITI, and "
        "subject property state from the page, calculates the VA residual income, and "
        "auto-fills the <i>VA residual income</i> and <i>VA total deductions</i> fields.",
        body_style,
    ))

    flow.append(Paragraph("What you will need", h1_style))
    flow.append(bulleted([
        "Google Chrome (or any Chromium-based browser: Edge, Brave, etc.)",
        "The extension files (a folder containing manifest.json, content.js, styles.css)",
        "About 5 minutes",
    ]))

    flow.append(Paragraph("Step 1 - Download and extract the files", h1_style))
    flow.append(Paragraph(
        "If you received the extension as a ZIP file, you need to unzip it before Chrome can "
        "load it. Chrome cannot load an extension from inside a ZIP archive.",
        body_style,
    ))
    flow.append(Paragraph("On Windows", h2_style))
    flow.append(numbered([
        "Locate the downloaded ZIP file (usually in your <b>Downloads</b> folder).",
        "Right-click the ZIP file and choose <b>Extract All...</b>",
        "Pick a destination you will remember - <b>Documents &#x2192; ResidualIncomeCalc</b> "
        "is a good choice. Click <b>Extract</b>.",
        "Open the extracted folder and confirm you see <b>manifest.json</b>, "
        "<b>content.js</b>, and <b>styles.css</b> at the top level. If those files are "
        "inside another sub-folder, open that sub-folder - that is the one Chrome will load.",
    ]))
    flow.append(Paragraph("On macOS", h2_style))
    flow.append(numbered([
        "Locate the downloaded ZIP file in your <b>Downloads</b> folder.",
        "Double-click the ZIP file. macOS will automatically extract it next to the "
        "original ZIP, creating a folder of the same name.",
        "Move the extracted folder somewhere stable, like your <b>Documents</b> folder. "
        "Do not leave it in <b>Downloads</b> if you regularly clean that folder out - "
        "Chrome will stop loading the extension if the folder disappears.",
        "Open the folder and confirm you see <b>manifest.json</b>, <b>content.js</b>, and "
        "<b>styles.css</b>.",
    ]))
    flow.append(Paragraph(
        "<b>Important:</b> keep this folder where you put it. Chrome reads the files from "
        "this exact location every time you open the browser. If you move or delete the "
        "folder, the extension will break.",
        note_style,
    ))

    flow.append(Paragraph("Step 2 - Open the Chrome Extensions page", h1_style))
    flow.append(numbered([
        "Open Google Chrome.",
        "In the address bar at the top, type the following exactly and press <b>Enter</b>:",
    ]))
    flow.append(Paragraph("chrome://extensions", mono_style))
    flow.append(Paragraph(
        "You can also reach this page through the menu: click the three-dot menu "
        "(top right of Chrome) &#x2192; <b>Extensions</b> &#x2192; <b>Manage Extensions</b>.",
        body_style,
    ))

    flow.append(Paragraph("Step 3 - Turn on Developer mode", h1_style))
    flow.append(Paragraph(
        "In the top-right corner of the Extensions page, find the <b>Developer mode</b> "
        "toggle. Click it so it turns blue / on. A new row of buttons will appear: "
        "<b>Load unpacked</b>, <b>Pack extension</b>, and <b>Update</b>.",
        body_style,
    ))
    flow.append(Paragraph(
        "Developer mode is required to install extensions that have not been published to "
        "the Chrome Web Store. It is safe to leave on - it does not change how Chrome "
        "behaves on websites.",
        note_style,
    ))

    flow.append(Paragraph("Step 4 - Load the extension", h1_style))
    flow.append(numbered([
        "Click the <b>Load unpacked</b> button (top-left, below the Extensions title).",
        "A file picker will open. Navigate to the folder you extracted in Step 1.",
        "Select the folder itself (do <b>not</b> open it and try to select an individual "
        "file) and click <b>Select Folder</b> on Windows or <b>Open</b> on macOS.",
        "The extension will appear as a tile on the Extensions page titled "
        "<b>VA Residual Income Calculator</b>.",
    ]))

    flow.append(Paragraph("Step 5 - Verify it works", h1_style))
    flow.append(numbered([
        "Open a loan in the operator portal at "
        "<b>operator.zillowhomeloans.com</b>.",
        "Navigate to the <b>Full application</b> tab and scroll to the <b>Military "
        "information</b> section.",
        "Set <b>Veteran type</b> to <i>Regular military</i> or <i>National Guard or "
        "reserves</i>.",
        "A blue <b>Run Residual Income Calc</b> button will appear to the right of the "
        "<i>Military service completed</i> checkbox.",
        "Click the button. A panel will appear in the lower-right of the page showing the "
        "calculated residual income and writing the result into the <i>VA residual income</i> "
        "field on the form.",
    ]))

    flow.append(Paragraph("Pinning the extension (optional)", h1_style))
    flow.append(Paragraph(
        "This extension does not have a popup, so pinning is not required. The button "
        "appears on the page itself when the conditions are met.",
        body_style,
    ))

    flow.append(Paragraph("Troubleshooting", h1_style))

    flow.append(Paragraph("\"Manifest file is missing or unreadable\"", h2_style))
    flow.append(Paragraph(
        "Chrome is pointing at the wrong folder. Make sure the folder you selected in "
        "Step 4 contains <b>manifest.json</b> directly inside it - not nested another "
        "level deep. If the folder you extracted contains a single sub-folder, point Chrome "
        "at that sub-folder instead.",
        body_style,
    ))

    flow.append(Paragraph("The button does not appear", h2_style))
    flow.append(bulleted([
        "Confirm Veteran type is set to <i>Regular military</i> or <i>National Guard or "
        "reserves</i>. The button is hidden for any other selection.",
        "Refresh the page (<b>F5</b> or <b>Cmd+R</b>) after installing or updating the "
        "extension.",
        "Open the Extensions page and confirm the toggle on the <i>VA Residual Income "
        "Calculator</i> tile is on.",
    ]))

    flow.append(Paragraph("A field shows $0 in the panel", h2_style))
    flow.append(Paragraph(
        "Open Chrome DevTools (right-click the page &#x2192; <b>Inspect</b> &#x2192; "
        "<b>Console</b> tab) and look for messages tagged <b>[Residual Income Calc]</b>. "
        "Send a screenshot of any errors so the field selector can be tightened.",
        body_style,
    ))

    flow.append(Paragraph("After Chrome restarts the extension is gone", h2_style))
    flow.append(Paragraph(
        "Chrome unloaded the extension because it could not find the folder. Make sure the "
        "extracted folder is in a stable location (not Downloads if you periodically empty "
        "it, not on a removable drive that may not be mounted). If you moved the folder, "
        "remove the broken extension on <b>chrome://extensions</b> and reinstall it from "
        "the new location using <b>Load unpacked</b>.",
        body_style,
    ))

    flow.append(Paragraph("Updating the extension", h1_style))
    flow.append(Paragraph(
        "When you receive a new version of the files, replace the contents of your "
        "extension folder with the new files (keep the folder location the same). Then go "
        "to <b>chrome://extensions</b> and click the circular <b>Reload</b> arrow on the "
        "<i>VA Residual Income Calculator</i> tile. Refresh any open portal tabs to pick "
        "up the change.",
        body_style,
    ))

    flow.append(Paragraph("Removing the extension", h1_style))
    flow.append(Paragraph(
        "Open <b>chrome://extensions</b>, find the tile, and click <b>Remove</b>. You can "
        "also delete the extracted folder afterwards.",
        body_style,
    ))

    doc.build(flow, onFirstPage=header_band, onLaterPages=header_band)
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    build()
