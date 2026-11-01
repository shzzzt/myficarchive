"""Builds the spreadsheet import template: python scripts/make-template.py
Writes assets/templates/my-fic-archive-template.xlsx (shipped in the app) and
scripts/fixtures/template-filled.xlsx (same layout with sample rows, used by npm test).
Column headers must stay matchable by src/lib/importers/rows.ts."""
from datetime import date
from pathlib import Path

from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parent.parent
ROWS = 1000  # rows prepared with dropdowns

INK = '2F2F45'
PINK = 'FF78B9'
PINK_SOFT = 'FFF0F7'
LAV_SOFT = 'F6F3FF'
SKY = 'DCE8FF'
SKY_LINE = 'A9C5F7'

STATUSES = ['Want to Read', 'Reading', 'Finished', 'On Hold', 'DNF']
RATINGS = ['0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5']

# header, width, required, help text, example
COLUMNS = [
    ('Title', 34, True, 'The fic title. Tip: make the title a hyperlink and it becomes the fic\'s link.', 'Euphoria'),
    ('Author', 20, True, 'Author name as on AO3.', 'peachyjams'),
    ('Words', 10, False, 'Word count: 31000, 31k or 1.2m all work.', '31k'),
    ('Fic status', 13, False, 'Completed or Ongoing (dropdown).', 'Completed'),
    ('Reading status', 16, False, 'Want to Read, Reading, Finished, On Hold or DNF (dropdown). Empty = Want to Read.', 'Finished'),
    ('My rating', 11, False, '0.5 to 5 in half stars (dropdown). ★★★★½ also works.', '4.5'),
    ('Favorite', 10, False, 'Yes or No (dropdown). Yes shows the heart.', 'Yes'),
    ('Tags', 28, False, 'Separate tags with commas.', 'fluff, soulmate au'),
    ('EPUB link', 26, False, 'Link to the EPUB file (Google Drive etc.).', 'https://drive.google.com/…'),
    ('PDF link', 26, False, 'Link to the PDF file.', 'https://drive.google.com/…'),
    ('AO3 link', 26, False, 'The fic\'s AO3 page.', 'https://archiveofourown.org/works/…'),
    ('Summary', 50, False, 'Paste the summary. Line breaks (Alt+Enter) are kept.', 'Jimin moves in next door…'),
    ('My thoughts', 40, False, 'Your review or notes.', 'cried twice ♡'),
    ('Started', 13, False, 'Date you started reading.', '2026-08-30'),
    ('Finished', 13, False, 'Date you finished.', '2026-09-12'),
]
COL = {h: get_column_letter(i + 1) for i, (h, *_rest) in enumerate(COLUMNS)}

thin = Side(style='thin', color=SKY_LINE)
box = Border(left=thin, right=thin, top=thin, bottom=thin)


def build(sample_rows=None):
    wb = Workbook()
    ws = wb.active
    ws.title = 'My Fics'
    ws.sheet_properties.tabColor = PINK

    # Header row
    for i, (header, width, required, help_text, _ex) in enumerate(COLUMNS, start=1):
        cell = ws.cell(row=1, column=i, value=header + (' *' if required else ''))
        cell.font = Font(bold=True, color='FFFFFF', size=11)
        cell.fill = PatternFill('solid', fgColor=PINK)
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        cell.border = Border(left=Side(style='thin', color='FFFFFF'), right=Side(style='thin', color='FFFFFF'))
        cell.comment = Comment(help_text, 'My Fic Archive', width=260, height=90)
        ws.column_dimensions[get_column_letter(i)].width = width
    ws.row_dimensions[1].height = 30
    ws.freeze_panes = 'B2'
    last = get_column_letter(len(COLUMNS))
    ws.auto_filter.ref = f'A1:{last}{ROWS + 1}'

    # Cell formats for the data area (no fills: the importer reads fills as "Ongoing").
    wrap_cols = {COL['Summary'], COL['My thoughts'], COL['Title'], COL['Tags']}
    for r in range(2, ROWS + 2):
        for i in range(1, len(COLUMNS) + 1):
            letter = get_column_letter(i)
            c = ws[f'{letter}{r}']
            c.border = box
            c.alignment = Alignment(vertical='top', wrap_text=letter in wrap_cols)
        ws[f'{COL["Started"]}{r}'].number_format = 'yyyy-mm-dd'
        ws[f'{COL["Finished"]}{r}'].number_format = 'yyyy-mm-dd'
        ws[f'{COL["My rating"]}{r}'].number_format = '0.0'
        ws[f'{COL["Started"]}{r}'].alignment = Alignment(horizontal='center', vertical='top')
        ws[f'{COL["Finished"]}{r}'].alignment = Alignment(horizontal='center', vertical='top')

    # Soft banding and an Ongoing tint, as conditional formats so they never count as cell fills.
    area = f'A2:{last}{ROWS + 1}'
    fs = COL['Fic status']
    ws.conditional_formatting.add(area, FormulaRule(formula=[f'${fs}2="Ongoing"'], fill=PatternFill('solid', fgColor=SKY, bgColor=SKY), stopIfTrue=True))
    ws.conditional_formatting.add(area, FormulaRule(formula=['MOD(ROW(),2)=0'], fill=PatternFill('solid', fgColor=LAV_SOFT, bgColor=LAV_SOFT)))

    def dropdown(col, values, prompt):
        dv = DataValidation(type='list', formula1='"' + ','.join(values) + '"', allow_blank=True,
                            showErrorMessage=True, errorStyle='warning',
                            error='Pick one from the list (or leave it empty).', errorTitle='My Fic Archive',
                            prompt=prompt, promptTitle=col, showInputMessage=True)
        ws.add_data_validation(dv)
        dv.add(f'{COL[col]}2:{COL[col]}{ROWS + 1}')

    dropdown('Fic status', ['Completed', 'Ongoing'], 'Completed or Ongoing')
    dropdown('Reading status', STATUSES, 'Empty = Want to Read')
    dropdown('My rating', RATINGS, 'Half stars are fine')
    dropdown('Favorite', ['Yes', 'No'], 'Yes adds the heart')
    for col in ('Started', 'Finished'):
        dv = DataValidation(type='date', operator='between', formula1='DATE(2000,1,1)', formula2='DATE(2100,12,31)',
                            allow_blank=True, showErrorMessage=True, errorStyle='warning',
                            error='Type a date like 2026-09-12.', errorTitle='My Fic Archive',
                            prompt='Like 2026-09-12', promptTitle=col, showInputMessage=True)
        ws.add_data_validation(dv)
        dv.add(f'{COL[col]}2:{COL[col]}{ROWS + 1}')

    for r, row in enumerate(sample_rows or [], start=2):
        for header, value in row.items():
            c = ws[f'{COL[header]}{r}']
            if header == 'Title' and isinstance(value, tuple):
                c.value, c.hyperlink = value
            else:
                c.value = value

    guide(wb.create_sheet('How to use'))
    return wb


def guide(ws):
    ws.sheet_properties.tabColor = '6F9BE8'
    ws.sheet_view.showGridLines = False
    widths = {'A': 3, 'B': 18, 'C': 11, 'D': 58, 'E': 30}
    for k, v in widths.items():
        ws.column_dimensions[k].width = v

    ws['B2'] = 'My Fic Archive · import template ♡'
    ws['B2'].font = Font(bold=True, size=16, color=PINK)
    steps = [
        'Add one fic per row on the "My Fics" tab. Only Title and Author are required.',
        'Use the dropdowns for status, rating and favorite. Hover a header to see what goes there.',
        'Columns can be moved or deleted; the app finds them by their header text.',
        'In the app: Backup tab → Choose spreadsheet → Import. Fics already in your library are skipped.',
        'This "How to use" tab is ignored when importing.',
    ]
    for i, s in enumerate(steps):
        c = ws.cell(row=4 + i, column=2, value=f'{i + 1}.  {s}')
        c.font = Font(size=11, color=INK)
        ws.merge_cells(start_row=4 + i, start_column=2, end_row=4 + i, end_column=5)

    top = 4 + len(steps) + 1
    for j, h in enumerate(['Column', 'Required', 'What to put', 'Example']):
        c = ws.cell(row=top, column=2 + j, value=h)
        c.font = Font(bold=True, color='FFFFFF')
        c.fill = PatternFill('solid', fgColor='6F9BE8')
        c.alignment = Alignment(vertical='center')
    ws.row_dimensions[top].height = 22
    for i, (header, _w, required, help_text, example) in enumerate(COLUMNS, start=1):
        r = top + i
        values = [header, 'Yes' if required else '', help_text, example]
        for j, v in enumerate(values):
            c = ws.cell(row=r, column=2 + j, value=v)
            c.alignment = Alignment(vertical='top', wrap_text=True)
            c.border = box
            c.font = Font(color=PINK if j == 1 else INK, bold=j == 0)
            if i % 2 == 0:
                c.fill = PatternFill('solid', fgColor=PINK_SOFT)

    tip = top + len(COLUMNS) + 2
    tips = [
        'Old sheets still work: rows filled light blue import as Ongoing when there is no Fic status column.',
        'Uploaded EPUB/PDF files aren\'t part of spreadsheets; add them on each fic\'s page in the app.',
    ]
    ws.cell(row=tip, column=2, value='Tips').font = Font(bold=True, color=PINK)
    for i, t in enumerate(tips):
        c = ws.cell(row=tip + 1 + i, column=2, value='♡  ' + t)
        c.font = Font(color=INK)
        ws.merge_cells(start_row=tip + 1 + i, start_column=2, end_row=tip + 1 + i, end_column=5)


SAMPLE = [
    {'Title': ('Euphoria', 'https://drive.google.com/file/d/xyz/view'), 'Author': 'peachyjams', 'Words': '31k',
     'Fic status': 'Completed', 'Reading status': 'Finished', 'My rating': 4.5, 'Favorite': 'Yes',
     'Tags': 'angst, #soulmate au', 'AO3 link': 'https://archiveofourown.org/works/111',
     'Summary': 'Jimin moves in next door.\nJungkook is not okay.', 'My thoughts': 'cried twice ♡',
     'Started': date(2026, 8, 30), 'Finished': date(2026, 9, 12)},
    {'Title': 'Moonlit Hours', 'Author': 'glitterjk', 'Words': 180000, 'Fic status': 'Ongoing',
     'Reading status': 'Reading', 'My rating': '★★★½', 'Favorite': 'No', 'Tags': 'slow burn; fluff',
     'EPUB link': 'drive.google.com/file/d/epub1', 'PDF link': 'https://drive.google.com/file/d/pdf1',
     'Started': '2026-10-02'},
    {'Title': 'Just a title', 'Author': 'sky'},
]

if __name__ == '__main__':
    out = ROOT / 'assets' / 'templates' / 'my-fic-archive-template.xlsx'
    out.parent.mkdir(parents=True, exist_ok=True)
    build().save(out)
    build(SAMPLE).save(ROOT / 'scripts' / 'fixtures' / 'template-filled.xlsx')
    print('wrote', out.relative_to(ROOT))
