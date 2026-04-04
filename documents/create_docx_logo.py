import zipfile
import os
import base64

def create_docx_with_logo(output_path, logo_path):
    # Read the logo image
    with open(logo_path, 'rb') as f:
        logo_data = f.read()
    logo_base64 = base64.b64encode(logo_data).decode('utf-8')
    
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        # [Content_Types].xml
        content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Default Extension="png" ContentType="image/png"/>
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
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>
</Relationships>'''
        zf.writestr('word/_rels/document.xml.rels', doc_rels)
        
        # Add the logo image
        zf.writestr('word/media/logo.png', logo_data)
        
        # word/document.xml - compact version for 1 page
        document_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
    <w:body>
        <!-- Logo -->
        <w:p>
            <w:pPr>
                <w:jc w:val="center"/>
                <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:drawing>
                    <wp:inline distT="0" distB="0" distL="0" distR="0">
                        <wp:extent cx="900000" cy="900000"/>
                        <wp:effectExtent l="0" t="0" r="0" b="0"/>
                        <wp:docPr id="1" name="Logo" descr="Vectarr Logo"/>
                        <wp:cNvGraphicFramePr>
                            <a:graphicFrameLocks noChangeAspect="1"/>
                        </wp:cNvGraphicFramePr>
                        <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                                    <pic:nvPicPr>
                                        <pic:cNvPr id="0" name="logo.png"/>
                                        <pic:cNvPicPr/>
                                    </pic:nvPicPr>
                                    <pic:blipFill>
                                        <a:blip r:embed="rId1"/>
                                        <a:stretch>
                                            <a:fillRect/>
                                        </a:stretch>
                                    </pic:blipFill>
                                    <pic:spPr>
                                        <a:xfrm>
                                            <a:off x="0" y="0"/>
                                            <a:ext cx="900000" cy="900000"/>
                                        </a:xfrm>
                                        <a:prstGeom prst="rect">
                                            <a:avLst/>
                                        </a:prstGeom>
                                    </pic:spPr>
                                </pic:pic>
                            </a:graphicData>
                        </a:graphic>
                    </wp:inline>
                </w:drawing>
            </w:r>
        </w:p>
        
        <!-- Company Name -->
        <w:p>
            <w:pPr>
                <w:jc w:val="center"/>
                <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:b/>
                    <w:sz w:val="36"/>
                </w:rPr>
                <w:t>VECTARR LLC</w:t>
            </w:r>
        </w:p>
        
        <!-- Company Info -->
        <w:p>
            <w:pPr>
                <w:jc w:val="center"/>
                <w:spacing w:after="0" w:line="200" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:sz w:val="18"/>
                </w:rPr>
                <w:t>A Texas Limited Liability Company</w:t>
            </w:r>
        </w:p>
        
        <w:p>
            <w:pPr>
                <w:jc w:val="center"/>
                <w:spacing w:after="0" w:line="200" w:lineRule="auto"/>
                <w:pBdr>
                    <w:bottom w:val="single" w:sz="12" w:space="1" w:color="000000"/>
                </w:pBdr>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:sz w:val="18"/>
                </w:rPr>
                <w:t>vectarr.com</w:t>
            </w:r>
        </w:p>
        
        <!-- Date -->
        <w:p>
            <w:pPr>
                <w:spacing w:after="0" w:line="220" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>Date: ___________________</w:t>
            </w:r>
        </w:p>
        
        <!-- RE Line -->
        <w:p>
            <w:pPr>
                <w:spacing w:after="0" w:line="220" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:b/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>RE: Ownership and Authorization Confirmation — Vehicle Registration</w:t>
            </w:r>
        </w:p>
        
        <w:p>
            <w:pPr>
                <w:spacing w:after="0" w:line="220" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:b/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>Member: Marc Alexander Sferrazza</w:t>
            </w:r>
        </w:p>
        
        <!-- Salutation -->
        <w:p>
            <w:pPr>
                <w:spacing w:after="0" w:line="220" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>To Whom It May Concern:</w:t>
            </w:r>
        </w:p>
        
        <!-- Main Content Paragraph -->
        <w:p>
            <w:pPr>
                <w:spacing w:after="0" w:line="220" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>This letter serves as official confirmation of the ownership structure and authorization status of </w:t>
            </w:r>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:b/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>Vectarr LLC</w:t>
            </w:r>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>, a Texas Limited Liability Company (the "Company").</w:t>
            </w:r>
        </w:p>
        
        <!-- Ownership Structure -->
        <w:p>
            <w:pPr>
                <w:spacing w:after="0" w:line="220" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:b/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>OWNERSHIP STRUCTURE</w:t>
            </w:r>
        </w:p>
        
        <w:p>
            <w:pPr>
                <w:spacing w:after="0" w:line="220" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>Vectarr LLC is equally owned by two (2) members, each holding a fifty percent (50%) ownership interest in the Company:</w:t>
            </w:r>
        </w:p>
        
        <w:p>
            <w:pPr>
                <w:spacing w:after="0" w:line="220" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>1. </w:t>
            </w:r>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:b/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>Marc Alexander Sferrazza</w:t>
            </w:r>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t> — 50% Member Interest</w:t>
            </w:r>
        </w:p>
        
        <w:p>
            <w:pPr>
                <w:spacing w:after="0" w:line="220" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>2. </w:t>
            </w:r>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:b/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>Kamal Katul</w:t>
            </w:r>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t> — 50% Member Interest</w:t>
            </w:r>
        </w:p>
        
        <!-- Authorization -->
        <w:p>
            <w:pPr>
                <w:spacing w:after="0" w:line="220" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:b/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>AUTHORIZATION</w:t>
            </w:r>
        </w:p>
        
        <w:p>
            <w:pPr>
                <w:spacing w:after="0" w:line="220" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>Marc Alexander Sferrazza is hereby confirmed as an authorized signer and agent of Vectarr LLC, with full authority to:</w:t>
            </w:r>
        </w:p>
        
        <w:p>
            <w:pPr>
                <w:spacing w:after="0" w:line="200" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:sz w:val="18"/>
                </w:rPr>
                <w:t>• Enter into contracts and agreements; open/maintain banking accounts; register, title, and insure motor vehicles;</w:t>
            </w:r>
        </w:p>
        
        <w:p>
            <w:pPr>
                <w:spacing w:after="0" w:line="200" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:sz w:val="18"/>
                </w:rPr>
                <w:t>• Execute all documentation related to vehicle acquisition, registration, and ownership; represent the Company in</w:t>
            </w:r>
        </w:p>
        
        <w:p>
            <w:pPr>
                <w:spacing w:after="0" w:line="200" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:sz w:val="18"/>
                </w:rPr>
                <w:t>  all business transactions; execute binding documents; and act as the Company's representative.</w:t>
            </w:r>
        </w:p>
        
        <w:p>
            <w:pPr>
                <w:spacing w:after="0" w:line="200" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:sz w:val="18"/>
                </w:rPr>
                <w:t>This authorization is made pursuant to the Operating Agreement of Vectarr LLC and Texas LLC laws.</w:t>
            </w:r>
        </w:p>
        
        <w:p>
            <w:pPr>
                <w:spacing w:after="0" w:line="200" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:sz w:val="18"/>
                </w:rPr>
                <w:t>This letter is executed by the undersigned to confirm the foregoing and provide reasonable assurance of Marc's authority.</w:t>
            </w:r>
        </w:p>
        
        <w:p>
            <w:pPr>
                <w:spacing w:after="0" w:line="200" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Verdana"/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>Sincerely,</w:t>
            </w:r>
        </w:p>
        
        <!-- Signature Table -->
        <w:tbl>
            <w:tblPr>
                <w:tblW w:w="5000" w:type="pct"/>
                <w:jc w:val="center"/>
                <w:tblBorders>
                    <w:top w:val="nil"/>
                    <w:left w:val="nil"/>
                    <w:bottom w:val="nil"/>
                    <w:right w:val="nil"/>
                    <w:insideH w:val="nil"/>
                    <w:insideV w:val="nil"/>
                </w:tblBorders>
            </w:tblPr>
            <w:tblGrid>
                <w:gridCol w:w="4680"/>
                <w:gridCol w:w="4680"/>
            </w:tblGrid>
            
            <!-- Row 1: Signature Lines -->
            <w:tr>
                <w:trPr>
                    <w:trHeight w:val="600" w:hRule="atLeast"/>
                </w:trPr>
                <w:tc>
                    <w:tcPr>
                        <w:tcW w:w="4680" w:type="dxa"/>
                        <w:vAlign w:val="bottom"/>
                    </w:tcPr>
                    <w:p>
                        <w:pPr>
                            <w:spacing w:after="0" w:line="200"/>
                            <w:jc w:val="center"/>
                        </w:pPr>
                        <w:r>
                            <w:rPr>
                                <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana"/>
                                <w:sz w:val="20"/>
                            </w:rPr>
                            <w:t>_________________________________</w:t>
                        </w:r>
                    </w:p>
                </w:tc>
                <w:tc>
                    <w:tcPr>
                        <w:tcW w:w="4680" w:type="dxa"/>
                        <w:vAlign w:val="bottom"/>
                    </w:tcPr>
                    <w:p>
                        <w:pPr>
                            <w:spacing w:after="0" w:line="200"/>
                            <w:jc w:val="center"/>
                        </w:pPr>
                        <w:r>
                            <w:rPr>
                                <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana"/>
                                <w:sz w:val="20"/>
                            </w:rPr>
                            <w:t>_________________________________</w:t>
                        </w:r>
                    </w:p>
                </w:tc>
            </w:tr>
            
            <!-- Row 2: Names -->
            <w:tr>
                <w:trPr>
                    <w:trHeight w:val="200" w:hRule="atLeast"/>
                </w:trPr>
                <w:tc>
                    <w:tcPr>
                        <w:tcW w:w="4680" w:type="dxa"/>
                        <w:vAlign w:val="top"/>
                    </w:tcPr>
                    <w:p>
                        <w:pPr>
                            <w:spacing w:after="0" w:line="200"/>
                            <w:jc w:val="center"/>
                        </w:pPr>
                        <w:r>
                            <w:rPr>
                                <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana"/>
                                <w:b/>
                                <w:sz w:val="18"/>
                            </w:rPr>
                            <w:t>Kamal Katul</w:t>
                        </w:r>
                    </w:p>
                </w:tc>
                <w:tc>
                    <w:tcPr>
                        <w:tcW w:w="4680" w:type="dxa"/>
                        <w:vAlign w:val="top"/>
                    </w:tcPr>
                    <w:p>
                        <w:pPr>
                            <w:spacing w:after="0" w:line="200"/>
                            <w:jc w:val="center"/>
                        </w:pPr>
                        <w:r>
                            <w:rPr>
                                <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana"/>
                                <w:b/>
                                <w:sz w:val="18"/>
                            </w:rPr>
                            <w:t>Marc Alexander Sferrazza</w:t>
                        </w:r>
                    </w:p>
                </w:tc>
            </w:tr>
            
            <!-- Row 3: Titles -->
            <w:tr>
                <w:trPr>
                    <w:trHeight w:val="200" w:hRule="atLeast"/>
                </w:trPr>
                <w:tc>
                    <w:tcPr>
                        <w:tcW w:w="4680" w:type="dxa"/>
                    </w:tcPr>
                    <w:p>
                        <w:pPr>
                            <w:spacing w:after="0" w:line="180"/>
                            <w:jc w:val="center"/>
                        </w:pPr>
                        <w:r>
                            <w:rPr>
                                <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana"/>
                                <w:sz w:val="16"/>
                            </w:rPr>
                            <w:t>Member, Vectarr LLC</w:t>
                        </w:r>
                    </w:p>
                </w:tc>
                <w:tc>
                    <w:tcPr>
                        <w:tcW w:w="4680" w:type="dxa"/>
                    </w:tcPr>
                    <w:p>
                        <w:pPr>
                            <w:spacing w:after="0" w:line="180"/>
                            <w:jc w:val="center"/>
                        </w:pPr>
                        <w:r>
                            <w:rPr>
                                <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana"/>
                                <w:sz w:val="16"/>
                            </w:rPr>
                            <w:t>Member, Vectarr LLC</w:t>
                        </w:r>
                    </w:p>
                </w:tc>
            </w:tr>
            
            <!-- Row 4: Dates -->
            <w:tr>
                <w:trPr>
                    <w:trHeight w:val="200" w:hRule="atLeast"/>
                </w:trPr>
                <w:tc>
                    <w:tcPr>
                        <w:tcW w:w="4680" w:type="dxa"/>
                    </w:tcPr>
                    <w:p>
                        <w:pPr>
                            <w:spacing w:after="0" w:line="180"/>
                            <w:jc w:val="center"/>
                        </w:pPr>
                        <w:r>
                            <w:rPr>
                                <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana"/>
                                <w:sz w:val="16"/>
                            </w:rPr>
                            <w:t>Date: _____________</w:t>
                        </w:r>
                    </w:p>
                </w:tc>
                <w:tc>
                    <w:tcPr>
                        <w:tcW w:w="4680" w:type="dxa"/>
                    </w:tcPr>
                    <w:p>
                        <w:pPr>
                            <w:spacing w:after="0" w:line="180"/>
                            <w:jc w:val="center"/>
                        </w:pPr>
                        <w:r>
                            <w:rPr>
                                <w:rFonts w:ascii="Verdana" w:hAnsi="Verdana"/>
                                <w:sz w:val="16"/>
                            </w:rPr>
                            <w:t>Date: _____________</w:t>
                        </w:r>
                    </w:p>
                </w:tc>
            </w:tr>
        </w:tbl>
        
        <w:sectPr>
            <w:pgSz w:w="12240" w:h="15840"/>
            <w:pgMar w:top="360" w:right="720" w:bottom="360" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
        </w:sectPr>
    </w:body>
</w:document>'''
        zf.writestr('word/document.xml', document_xml)

if __name__ == '__main__':
    create_docx_with_logo('documents/Vectarr-Authorization-Letter.docx', 'documents/vectarr-logo.png')
    print('Document created successfully!')
