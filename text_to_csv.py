#!/usr/bin/env python3
"""
text_to_csv.py - Convert text files to CSV format.

Handles various input formats:
- Delimited text (comma, tab, pipe, etc.)
- Fixed-width text
- One record per line (single column output)
- Multi-column output with custom delimiters
"""

import argparse
import csv
import re
import sys
from pathlib import Path


def detect_delimiter(line: str, candidates: list[str] = None) -> str:
    """Attempt to detect the delimiter in a text line."""
    if candidates is None:
        candidates = ['\t', '|', ';', ',']
    
    counts = {d: line.count(d) for d in candidates}
    best = max(counts, key=counts.get)
    return best if counts[best] > 0 else None


def parse_delimited_text(lines: list[str], delimiter: str = None, 
                         quotechar: str = '"', skip_empty: bool = True) -> list[list[str]]:
    """Parse delimited text into rows."""
    rows = []
    
    for line in lines:
        line = line.rstrip('\n\r')
        if skip_empty and not line.strip():
            continue
            
        if delimiter is None:
            delimiter = detect_delimiter(line) or ','
        
        # Simple split - handles basic cases
        # For more complex parsing, consider using csv.reader on the line
        parts = line.split(delimiter)
        rows.append([p.strip() for p in parts])
    
    return rows


def parse_fixed_width(lines: list[str], widths: list[int], skip_empty: bool = True) -> list[list[str]]:
    """Parse fixed-width text into rows using specified column widths."""
    rows = []
    
    for line in lines:
        line = line.rstrip('\n\r')
        if skip_empty and not line.strip():
            continue
        
        row = []
        pos = 0
        for width in widths:
            field = line[pos:pos + width].strip()
            row.append(field)
            pos += width
        rows.append(row)
    
    return rows


def read_text_file(filepath: Path, encoding: str = 'utf-8') -> list[str]:
    """Read text file and return lines."""
    try:
        with open(filepath, 'r', encoding=encoding) as f:
            return f.readlines()
    except UnicodeDecodeError:
        # Try with different encoding
        with open(filepath, 'r', encoding='latin-1') as f:
            return f.readlines()


def write_csv(rows: list[list[str]], output_path: Path, 
              delimiter: str = ',', quotechar: str = '"',
              headers: list[str] = None) -> None:
    """Write rows to CSV file."""
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f, delimiter=delimiter, quotechar=quotechar,
                           quoting=csv.QUOTE_MINIMAL)
        if headers:
            writer.writerow(headers)
        writer.writerows(rows)


def auto_generate_headers(num_cols: int, has_header: bool = False) -> list[str]:
    """Generate default column headers."""
    if has_header:
        return None
    return [f'Column_{i+1}' for i in range(num_cols)]


def main():
    parser = argparse.ArgumentParser(
        description='Convert text files to CSV format',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s input.txt output.csv
  %(prog)s -d '|' data.log results.csv
  %(prog)s -w 10,20,15 fixed_width.txt output.csv
  %(prog)s --header Name,Age,City input.txt output.csv
  %(prog)s -d ',' --header-line input.csv output_clean.csv
        """
    )
    
    parser.add_argument('input', type=Path, help='Input text file')
    parser.add_argument('output', type=Path, help='Output CSV file')
    parser.add_argument('-d', '--delimiter', help='Input delimiter (auto-detect if not specified)')
    parser.add_argument('-w', '--widths', help='Fixed column widths (comma-separated, e.g., "10,20,15")')
    parser.add_argument('--header', help='Comma-separated header names')
    parser.add_argument('--header-line', action='store_true', 
                       help='Use first line of input as header')
    parser.add_argument('--out-delimiter', default=',', help='Output CSV delimiter (default: comma)')
    parser.add_argument('--encoding', default='utf-8', help='File encoding (default: utf-8)')
    parser.add_argument('--no-skip-empty', action='store_true', 
                       help='Include empty lines in output')
    
    args = parser.parse_args()
    
    # Validate input file
    if not args.input.exists():
        print(f"Error: Input file not found: {args.input}", file=sys.stderr)
        sys.exit(1)
    
    # Read input
    try:
        lines = read_text_file(args.input, args.encoding)
    except Exception as e:
        print(f"Error reading file: {e}", file=sys.stderr)
        sys.exit(1)
    
    if not lines:
        print("Warning: Input file is empty", file=sys.stderr)
        write_csv([], args.output, args.out_delimiter)
        print(f"Created empty CSV: {args.output}")
        return
    
    # Parse based on mode
    skip_empty = not args.no_skip_empty
    headers = None
    
    if args.widths:
        # Fixed-width mode
        try:
            widths = [int(w) for w in args.widths.split(',')]
        except ValueError:
            print("Error: Widths must be comma-separated integers", file=sys.stderr)
            sys.exit(1)
        rows = parse_fixed_width(lines, widths, skip_empty)
    else:
        # Delimited mode
        input_delimiter = args.delimiter
        rows = parse_delimited_text(lines, input_delimiter, skip_empty=skip_empty)
    
    if not rows:
        print("Warning: No data rows found after parsing", file=sys.stderr)
        write_csv([], args.output, args.out_delimiter)
        print(f"Created empty CSV: {args.output}")
        return
    
    # Handle headers
    if args.header_line:
        headers = rows[0]
        rows = rows[1:]
    elif args.header:
        headers = args.header.split(',')
    else:
        headers = auto_generate_headers(len(rows[0]))
    
    # Validate header count matches columns
    if headers and len(headers) != len(rows[0]):
        print(f"Warning: Header count ({len(headers)}) doesn't match column count ({len(rows[0])})", 
              file=sys.stderr)
    
    # Write output
    try:
        write_csv(rows, args.output, args.out_delimiter, headers=headers)
        print(f"Converted {args.input} → {args.output}")
        print(f"  Rows: {len(rows)}, Columns: {len(rows[0]) if rows else 0}")
        if headers:
            print(f"  Headers: {', '.join(headers)}")
    except Exception as e:
        print(f"Error writing CSV: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
