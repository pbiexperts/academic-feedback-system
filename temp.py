import pandas as pd
import json

xl = pd.ExcelFile('College_Feedback_Master_Data.xlsx')

data = {}
for sheet in ['Feedback_Schema', 'Feedback_Responses']:
    df = pd.read_excel(xl, sheet_name=sheet, header=None).head(10).fillna('')
    data[sheet] = df.to_dict(orient='records')

with open('temp.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
