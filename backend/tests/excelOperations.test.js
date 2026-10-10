import * as XLSX from 'xlsx';

describe('Excel Utilities & Student Import/Export Tests', () => {
  test('generates valid student upload Excel workbook and parses back correctly', () => {
    const sampleStudents = [
      {
        'Full Name': 'Aarav Kumar',
        'Email': 'aarav@example.com',
        'Password': 'Password@123',
        'Roll Number': 'CS-101',
        'Phone': '9876543210'
      },
      {
        'Full Name': 'Diya Sharma',
        'Email': 'diya@example.com',
        'Password': 'Password@456',
        'Roll Number': 'CS-102',
        'Phone': '9876543211'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleStudents);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // Parse buffer back
    const readWb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = readWb.SheetNames[0];
    const parsedData = XLSX.utils.sheet_to_json(readWb.Sheets[sheetName]);

    expect(parsedData).toHaveLength(2);
    expect(parsedData[0]['Full Name']).toBe('Aarav Kumar');
    expect(parsedData[0]['Email']).toBe('aarav@example.com');
    expect(parsedData[1]['Roll Number']).toBe('CS-102');
  });

  test('generates valid results export Excel buffer', () => {
    const sampleResults = [
      {
        'S.No': 1,
        'Student Name': 'Aarav Kumar',
        'Email': 'aarav@example.com',
        'Roll Number': 'CS-101',
        'Exam Title': 'Java Core Assessment',
        'Score Obtained': 90,
        'Max Marks': 100,
        'Percentage (%)': '90.00%',
        'Status': 'PASSED',
        'Submission Date': new Date().toISOString()
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleResults);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    expect(buf.length).toBeGreaterThan(100);

    const readWb = XLSX.read(buf, { type: 'buffer' });
    const parsed = XLSX.utils.sheet_to_json(readWb.Sheets['Results']);
    expect(parsed[0]['Status']).toBe('PASSED');
    expect(parsed[0]['Score Obtained']).toBe(90);
  });
});
