import zipfile
import os

# Create the document structure
# A docx file is a zip archive with specific XML files

def create_minimal_docx(output_path):
    # Create a minimal docx structure
    # We need: [Content_Types].xml, word/document.xml, _rels/.rels, word/_rels/document.xml.rels
    
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        # [Content_Types].xml
        content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>'''
        zf.writestr('[Content_Types].xml', content_types)
        
        # _rels/.rels
        rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''
        zf.writestr('_rels/.rels', rels)
        
        # word/_rels/document.xml.rels
        doc_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>'''
        zf.writestr('word/_rels/document.xml.rels', doc_rels)
        
        # word/document.xml - the actual content
        document_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
    <w:body>
        <w:p>
            <w:pPr>
                <w:jc w:val="center"/>
                <w:pBdr>
                    <w:bottom w:val="single" w:sz="12" w:space="1" w:color="000000"/>
                </w:pBdr>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:b/>
                    <w:sz w:val="48"/>
                </w:rPr>
                <w:t>VECTARR LLC</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:pPr>
                <w:jc w:val="center"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>A Texas Limited Liability Company</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:pPr>
                <w:jc w:val="center"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>vectarr.com</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:pPr>
                <w:pBdr>
                    <w:bottom w:val="single" w:sz="12" w:space="1" w:color="000000"/>
                </w:pBdr>
            </w:pPr>
            <w:r>
                <w:t></w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t xml:space="preserve"> </w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t>Date: ___________________</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t xml:space="preserve"> </w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:rPr>
                    <w:b/>
                </w:rPr>
                <w:t>RE: Ownership and Authorization Confirmation — Vehicle Registration</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:rPr>
                    <w:b/>
                </w:rPr>
                <w:t>Member: Marc Alexander Sferrazza</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t xml:space="preserve"> </w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t>To Whom It May Concern:</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t xml:space="preserve"> </w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t>This letter serves as official confirmation of the ownership structure and authorization status of </w:t>
            </w:r>
            <w:r>
                <w:rPr>
                    <w:b/>
                </w:rPr>
                <w:t>Vectarr LLC</w:t>
            </w:r>
            <w:r>
                <w:t>, a Texas Limited Liability Company (the "Company").</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t xml:space="preserve"> </w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:rPr>
                    <w:b/>
                </w:rPr>
                <w:t>OWNERSHIP STRUCTURE</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t>Vectarr LLC is equally owned by two (2) members, each holding a fifty percent (50%) ownership interest in the Company:</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t xml:space="preserve"> </w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:pPr>
                <w:numPr>
                    <w:ilvl w:val="0"/>
                    <w:numId w:val="1"/>
                </w:numPr>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:b/>
                </w:rPr>
                <w:t>Marc Alexander Sferrazza</w:t>
            </w:r>
            <w:r>
                <w:t> — 50% Member Interest</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:pPr>
                <w:numPr>
                    <w:ilvl w:val="0"/>
                    <w:numId w:val="1"/>
                </w:numPr>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:b/>
                </w:rPr>
                <w:t>Kamal Katul</w:t>
            </w:r>
            <w:r>
                <w:t> — 50% Member Interest</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t xml:space="preserve"> </w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:rPr>
                    <w:b/>
                </w:rPr>
                <w:t>AUTHORIZATION</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t>Marc Alexander Sferrazza is hereby confirmed as an authorized signer and agent of Vectarr LLC, with full authority to:</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:pPr>
                <w:pBdr>
                    <w:left w:val="nil"/>
                </w:pBdr>
            </w:pPr>
            <w:r>
                <w:t>• Enter into contracts and agreements on behalf of the Company;</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t>• Open, maintain, and operate business banking and financial accounts;</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t>• Register, title, and insure motor vehicles in the Company's name;</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t>• Execute all documentation related to vehicle acquisition, registration, and ownership;</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t>• Represent the Company in business transactions and negotiations;</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t>• Execute documents, instruments, and obligations binding the Company;</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t>• Act as the Company's representative in all official capacities.</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t xml:space="preserve"> </w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t>This authorization is made pursuant to the Operating Agreement of Vectarr LLC and the applicable laws of the State of Texas governing limited liability companies.</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t xml:space="preserve"> </w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t>This letter is executed by the undersigned members of Vectarr LLC to confirm the foregoing statements and to provide any third party with reasonable assurance of Marc Alexander Sferrazza's authority to act on behalf of the Company.</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t xml:space="preserve"> </w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t>Sincerely,</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t xml:space="preserve"> </w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t xml:space="preserve"> </w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t xml:space="preserve"> </w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:r>
                <w:t xml:space="preserve"> </w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:pPr>
                <w:jc w:val="center"/>
            </w:pPr>
            <w:r>
                <w:t>_________________________________________                    _________________________________________</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:pPr>
                <w:jc w:val="center"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:b/>
                </w:rPr>
                <w:t>Kamal Katul</w:t>
            </w:r>
            <w:r>
                <w:t xml:space="preserve">                                                                                                    </w:t>
            </w:r>
            <w:r>
                <w:rPr>
                    <w:b/>
                </w:rPr>
                <w:t>Marc Alexander Sferrazza</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:pPr>
                <w:jc w:val="center"/>
            </w:pPr>
            <w:r>
                <w:t>Member, Vectarr LLC</w:t>
            </w:r>
            <w:r>
                <w:t xml:space="preserve">                                                                                                                               </w:t>
            </w:r>
            <w:r>
                <w:t>Member, Vectarr LLC</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:pPr>
                <w:jc w:val="center"/>
            </w:pPr>
            <w:r>
                <w:t>Date: _______________</w:t>
            </w:r>
            <w:r>
                <w:t xml:space="preserve">                                                                                                                                               </w:t>
            </w:r>
            <w:r>
                <w:t>Date: _______________</w:t>
            </w:r>
        </w:p>
        <w:sectPr>
            <w:pgSz w:w="12240" w:h="15840"/>
            <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="720" w:footer="720" w:gutter="0"/>
        </w:sectPr>
    </w:body>
</w:document>'''
        zf.writestr('word/document.xml', document_xml)

if __name__ == '__main__':
    create_minimal_docx('documents/Vectarr-Authorization-Letter.docx')
    print('Document created successfully!')
