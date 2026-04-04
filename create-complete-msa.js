const fs = require('fs');
const JSZip = require('jszip');

const zip = new JSZip();

// [Content_Types].xml
zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`);

// _rels/.rels
const rels = zip.folder('_rels');
rels.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);

// word/_rels/document.xml.rels
const wordRels = zip.folder('word/_rels');
wordRels.file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
</Relationships>`);

// word/styles.xml
zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:eastAsia="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="160" w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr>
      <w:spacing w:after="160" w:line="276" w:lineRule="auto"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
      <w:sz w:val="22"/>
      <w:szCs w:val="22"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="360" w:after="200" w:line="276" w:lineRule="auto"/>
      <w:outlineLvl w:val="0"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri Light" w:hAnsi="Calibri Light" w:cs="Calibri Light"/>
      <w:b/>
      <w:bCs/>
      <w:color w:val="1F4E79"/>
      <w:sz w:val="32"/>
      <w:szCs w:val="32"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:spacing w:after="200" w:line="240" w:lineRule="auto"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri Light" w:hAnsi="Calibri Light" w:cs="Calibri Light"/>
      <w:b/>
      <w:bCs/>
      <w:color w:val="1F4E79"/>
      <w:sz w:val="56"/>
      <w:szCs w:val="56"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle">
    <w:name w:val="Subtitle"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:spacing w:after="400" w:line="240" w:lineRule="auto"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
      <w:color w:val="5B9BD5"/>
      <w:sz w:val="28"/>
      <w:szCs w:val="28"/>
    </w:rPr>
  </w:style>
  <w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont">
    <w:name w:val="Default Paragraph Font"/>
  </w:style>
</w:styles>`);

// word/settings.xml
zip.file('word/settings.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:zoom w:percent="100"/>
  <w:defaultTabStop w:val="720"/>
  <w:characterSpacingControl w:val="doNotCompress"/>
  <w:compat>
    <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>
  </w:compat>
</w:settings>`);

// word/fontTable.xml
zip.file('word/fontTable.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:font w:name="Calibri">
    <w:panose1 w:val="020F0502020204030204"/>
    <w:charset w:val="00"/>
    <w:family w:val="swiss"/>
    <w:pitch w:val="variable"/>
  </w:font>
  <w:font w:name="Calibri Light">
    <w:panose1 w:val="020F0302020204030204"/>
    <w:charset w:val="00"/>
    <w:family w:val="swiss"/>
    <w:pitch w:val="variable"/>
  </w:font>
</w:fonts>`);

// docProps/core.xml
zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Vectarr LLC - Master Service Agreement</dc:title>
  <dc:subject>Complete Legal Documentation</dc:subject>
  <dc:creator>Vectarr LLC</dc:creator>
  <cp:lastModifiedBy>Vectarr LLC</cp:lastModifiedBy>
  <cp:revision>1</cp:revision>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-02-18T18:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-02-18T18:00:00Z</dcterms:modified>
</cp:coreProperties>`);

// docProps/app.xml
zip.file('docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Template>Normal.dotm</Template>
  <TotalTime>0</TotalTime>
  <Pages>12</Pages>
  <Words>5500</Words>
  <Characters>31000</Characters>
  <Application>Microsoft Office Word</Application>
  <DocSecurity>0</DocSecurity>
  <Lines>250</Lines>
  <Paragraphs>120</Paragraphs>
  <ScaleCrop>false</ScaleCrop>
  <Company>Vectarr LLC</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <CharactersWithSpaces>36000</CharactersWithSpaces>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>`);

// Build complete document content
const paras = [];

function addPara(text, style = 'Normal', extra = {}) {
  let xml = `<w:p><w:pPr><w:pStyle w:val="${style}"/>`;
  if (extra.center) xml += `<w:jc w:val="center"/>`;
  if (extra.spaceBefore) xml += `<w:spacing w:before="${extra.spaceBefore}"/>`;
  if (extra.spaceAfter !== undefined) xml += `<w:spacing w:after="${extra.spaceAfter}"/>`;
  xml += `</w:pPr>`;
  
  if (text) {
    xml += `<w:r><w:rPr>`;
    if (extra.bold) xml += `<w:b/>`;
    if (extra.color) xml += `<w:color w:val="${extra.color}"/>`;
    if (extra.size) xml += `<w:sz w:val="${extra.size}"/><w:szCs w:val="${extra.size}"/>`;
    xml += `</w:rPr><w:t>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t></w:r>`;
  }
  xml += `</w:p>`;
  paras.push(xml);
}

function addHeading(num, text) {
  addPara(text, 'Heading1');
}

// ===== DOCUMENT CONTENT =====

// Title Page
addPara('', 'Title', {spaceAfter: 0});
addPara('VECTARR LLC', 'Title');
addPara('Master Service Agreement', 'Subtitle');
addPara('Terms of Service', 'Subtitle', {spaceAfter: 200});
addPara('', 'Normal', {spaceAfter: 400});
addPara('Effective Date: Upon Acceptance', 'Normal', {center: true, color: '404040', size: 22});
addPara('Version 1.0 | www.vectarr.com', 'Normal', {center: true, color: '404040', size: 22});
addPara('', 'Normal', {spaceAfter: 600});

// Intro paragraph
addPara('THIS MASTER SERVICE AGREEMENT (the "Agreement") is entered into between Vectarr LLC, a Texas limited liability company with its principal place of business in Austin, Texas ("Vectarr," "we," "us," or "our"), and the individual or entity accepting these terms ("User," "you," or "your"). By accessing or using the Vectarr platform, you acknowledge that you have read, understood, and agree to be bound by this Agreement.', 'Normal', {spaceAfter: 200});

// Section 1
addHeading(1, '1. DEFINITIONS');
addPara('1.1 "Platform" means the Vectarr online marketplace and quoting system accessible at www.vectarr.com and any related mobile applications, APIs, or services.');
addPara('1.2 "Services" means the machine shop quoting, RFQ management, supplier marketplace, and related business services provided by Vectarr through the Platform.');
addPara('1.3 "User Content" means any data, CAD files, specifications, RFQs, quotes, communications, or other materials submitted by Users to the Platform.');
addPara('1.4 "Machine Shop" means a manufacturing supplier registered on the Platform capable of providing machining, fabrication, or related manufacturing services.');
addPara('1.5 "Quote" means a pricing proposal submitted by a Machine Shop in response to a User RFQ.');
addPara('1.6 "Transaction" means the agreement between a User and Machine Shop for manufacturing services, facilitated through the Platform.');
addPara('1.7 "Confidential Information" means any non-public, proprietary, or confidential information disclosed by either party, including but not limited to business plans, customer data, pricing, technical specifications, and trade secrets.');

// Section 2
addHeading(1, '2. SERVICES DESCRIPTION');
addPara('2.1 Platform Access. Vectarr provides a technology platform connecting Users seeking manufacturing services with qualified Machine Shops. Vectarr does not provide manufacturing services directly and is not a party to any Transaction between Users and Machine Shops.');
addPara('2.2 Quoting System. Users may submit Requests for Quotation (RFQs) through the Platform. Machine Shops may review RFQs and submit Quotes. Vectarr facilitates communication but does not guarantee the accuracy, completeness, or suitability of any Quote.');
addPara('2.3 Supplier Vetting. Vectarr may conduct initial verification of Machine Shops, including business registration and capability assessments. However, Vectarr does not warrant the quality, reliability, or performance of any Machine Shop.');
addPara('2.4 Payment Processing. Vectarr may provide payment processing services for Transactions. All payment processing is subject to the terms of Schedule B (Fee Schedule) and applicable payment processor terms.');
addPara('2.5 Support Services. Vectarr provides technical support for Platform functionality during Business Hours (Monday-Friday, 9:00 AM - 5:00 PM CST), excluding holidays.');

// Section 3
addHeading(1, '3. USER OBLIGATIONS');
addPara('3.1 Account Registration. Users must provide accurate, current, and complete information during registration. Users are responsible for maintaining the confidentiality of account credentials and for all activities occurring under their account.');
addPara('3.2 Acceptable Use. Users agree not to: (a) use the Platform for illegal purposes; (b) attempt to gain unauthorized access to Platform systems; (c) interfere with other Users\' access or use; (d) upload viruses, malware, or harmful code; (e) scrape, data-mine, or copy Platform content without authorization; (f) circumvent Platform security measures; (g) use the Platform to compete with Vectarr without written consent.');
addPara('3.3 User Content. Users retain ownership of User Content but grant Vectarr a non-exclusive, worldwide, royalty-free license to use, reproduce, modify, and display User Content solely to operate and improve the Platform. Users represent that they have all necessary rights to User Content and that it does not violate any third-party intellectual property rights.');
addPara('3.4 RFQ Accuracy. Users warrant that all RFQ specifications, quantities, delivery requirements, and related information are accurate and complete. Vectarr is not liable for losses arising from inaccurate or incomplete RFQ information.');
addPara('3.5 Compliance. Users shall comply with all applicable laws, regulations, and industry standards, including export control laws, anti-corruption laws, and environmental regulations.');

// Section 4
addHeading(1, '4. PAYMENT TERMS');
addPara('4.1 Platform Fees. Users agree to pay all fees specified in Schedule B (Fee Schedule). Fees may include subscription charges, transaction fees, payment processing fees, and premium service fees.');
addPara('4.2 Invoicing. Vectarr will invoice Users monthly for accrued fees. Invoices are due within thirty (30) days of the invoice date.');
addPara('4.3 Late Payments. Unpaid balances shall accrue late charges at the rate of 1.5% per month (18% per annum) or the maximum rate permitted by law, whichever is less. Vectarr may suspend Platform access for accounts more than thirty (30) days past due.');
addPara('4.4 Collection Costs. Users are liable for all costs of collection, including reasonable attorneys\' fees, for amounts not paid when due.');
addPara('4.5 Taxes. Users are responsible for all applicable sales, use, VAT, GST, and other taxes arising from use of the Platform, excluding taxes based on Vectarr\'s net income.');
addPara('4.6 Disputed Charges. Users must dispute invoice charges in writing within fifteen (15) days of the invoice date. Undisputed portions must be paid when due.');
addPara('4.7 Refunds. All fees are non-refundable except as expressly provided in this Agreement or as required by law.');

// Section 5
addHeading(1, '5. INTELLECTUAL PROPERTY');
addPara('5.1 Vectarr IP. Vectarr retains all right, title, and interest in the Platform, including all software, algorithms, databases, user interfaces, documentation, and related technology. This Agreement does not grant any license to Vectarr\'s intellectual property except as expressly stated.');
addPara('5.2 User IP. Users retain all intellectual property rights in User Content, subject to the license grant in Section 3.3. Vectarr agrees not to use User Content for purposes other than operating and improving the Platform without User consent.');
addPara('5.3 Feedback. Users grant Vectarr a perpetual, irrevocable, royalty-free license to use any feedback, suggestions, or ideas provided regarding the Platform, without restriction or obligation.');
addPara('5.4 Machine Shop IP. Machine Shops retain intellectual property rights in their Quotes, technical capabilities, and proprietary processes. Users agree not to reverse engineer, copy, or misappropriate Machine Shop intellectual property.');
addPara('5.5 Infringement Claims. If a third party claims that User Content infringes their intellectual property rights, Vectarr may remove the content and notify the User. Repeat infringers may have their accounts terminated.');

// Section 6
addHeading(1, '6. CONFIDENTIALITY');
addPara('6.1 Confidentiality Obligations. Each party agrees to: (a) hold Confidential Information in strict confidence; (b) use Confidential Information only for purposes of this Agreement; (c) disclose Confidential Information only to employees and contractors with a need to know and who are bound by confidentiality obligations; (d) protect Confidential Information with at least the same degree of care used to protect its own confidential information, but no less than reasonable care.');
addPara('6.2 Exclusions. Confidential Information does not include information that: (a) is or becomes publicly available through no breach of this Agreement; (b) was rightfully known prior to disclosure; (c) is rightfully received from a third party without restriction; (d) is independently developed without use of Confidential Information.');
addPara('6.3 Required Disclosure. A party may disclose Confidential Information if required by law, regulation, or court order, provided prompt written notice to the other party (where legally permitted) and cooperation to seek confidential treatment.');
addPara('6.4 Breach Notification. If either party becomes aware of unauthorized access to or disclosure of Confidential Information, it shall promptly notify the other party and cooperate in remediation efforts.');
addPara('6.5 Duration. Confidentiality obligations survive termination of this Agreement for a period of five (5) years.');

// Section 7
addHeading(1, '7. LIMITATION OF LIABILITY');
addPara('7.1 Disclaimer of Warranties. THE PLATFORM AND SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR ACCURACY. VECTARR DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.');
addPara('7.2 No Warranty for Transactions. VECTARR DOES NOT WARRANT THE QUALITY, TIMELINESS, OR FITNESS FOR PURPOSE OF ANY GOODS OR SERVICES PROVIDED BY MACHINE SHOPS. ALL TRANSACTIONS ARE AT USER\'S SOLE RISK.');
addPara('7.3 Limitation of Liability. TO THE MAXIMUM EXTENT PERMITTED BY LAW, VECTARR\'S TOTAL LIABILITY ARISING FROM OR RELATED TO THIS AGREEMENT SHALL NOT EXCEED THE GREATER OF: (A) THE AMOUNT PAID BY USER TO VECTARR IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM; OR (B) ONE THOUSAND DOLLARS ($1,000.00).');
addPara('7.4 Exclusion of Consequential Damages. IN NO EVENT SHALL VECTARR BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST DATA, OR BUSINESS INTERRUPTION, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.');
addPara('7.5 Essential Purpose. THE LIMITATIONS IN SECTIONS 7.3 AND 7.4 APPLY REGARDLESS OF THE FORM OF ACTION, WHETHER IN CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR OTHERWISE, AND SURVIVE ANY TERMINATION OF THIS AGREEMENT.');

// Section 8
addHeading(1, '8. INDEMNIFICATION');
addPara('8.1 User Indemnification. Users agree to defend, indemnify, and hold harmless Vectarr and its officers, directors, employees, agents, and affiliates from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys\' fees) arising from: (a) User\'s use of the Platform; (b) User Content; (c) User\'s violation of this Agreement or applicable law; (d) any Transaction between User and a Machine Shop.');
addPara('8.2 Vectarr Indemnification. Vectarr agrees to defend, indemnify, and hold harmless Users from third-party claims that the Platform, when used in accordance with this Agreement, infringes any valid U.S. patent or copyright. Vectarr\'s sole obligation for any such claim shall be to: (a) obtain rights for User to continue using the Platform; (b) modify the Platform to be non-infringing; or (c) terminate this Agreement and refund pro-rata fees.');
addPara('8.3 Indemnification Procedure. The indemnified party shall: (a) promptly notify the indemnifying party of any claim; (b) grant the indemnifying party sole control of the defense and settlement; (c) reasonably cooperate with the defense. The indemnifying party shall not settle any claim in a manner that adversely affects the indemnified party without consent.');

// Section 9
addHeading(1, '9. TERMINATION');
addPara('9.1 Term. This Agreement commences upon User\'s acceptance and continues until terminated by either party as provided herein.');
addPara('9.2 Termination for Convenience. Either party may terminate this Agreement for any reason upon ninety (90) days\' prior written notice.');
addPara('9.3 Termination for Cause. Either party may terminate this Agreement immediately upon written notice if: (a) the other party materially breaches this Agreement and fails to cure within thirty (30) days of written notice; (b) the other party becomes insolvent, files for bankruptcy, or ceases business operations.');
addPara('9.4 Effect of Termination. Upon termination: (a) all licenses granted by Vectarr terminate immediately; (b) User must cease all use of the Platform; (c) Vectarr may delete User Content after providing thirty (30) days\' notice; (d) User remains liable for all accrued fees and obligations.');
addPara('9.5 Survival. Sections 4 (Payment Terms), 5 (Intellectual Property), 6 (Confidentiality), 7 (Limitation of Liability), 8 (Indemnification), 10 (Dispute Resolution), and 11 (General Provisions) survive termination of this Agreement.');

// Section 10
addHeading(1, '10. DISPUTE RESOLUTION');
addPara('10.1 Governing Law. This Agreement shall be governed by and construed in accordance with the laws of the State of Texas, without regard to conflict of laws principles.');
addPara('10.2 Jurisdiction. Any legal action arising from this Agreement shall be brought exclusively in the state or federal courts located in Travis County, Texas. Users consent to the personal jurisdiction of such courts.');
addPara('10.3 Informal Resolution. Before initiating formal dispute resolution, the parties agree to attempt to resolve disputes informally through good faith negotiations for at least thirty (30) days.');
addPara('10.4 Mediation. If informal resolution fails, disputes shall be submitted to non-binding mediation in Austin, Texas, conducted by a mutually agreeable mediator. Each party shall bear its own mediation costs.');
addPara('10.5 Attorneys\' Fees. In any dispute arising from this Agreement, the prevailing party shall be entitled to recover reasonable attorneys\' fees, costs, and expenses from the non-prevailing party.');
addPara('10.6 Class Action Waiver. TO THE MAXIMUM EXTENT PERMITTED BY LAW, USERS AGREE THAT ANY PROCEEDINGS WILL BE CONDUCTED ONLY ON AN INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION.');
addPara('10.7 Injunctive Relief. Either party may seek injunctive or other equitable relief in any court of competent jurisdiction to prevent irreparable harm pending resolution of a dispute.');

// Section 11
addHeading(1, '11. GENERAL PROVISIONS');
addPara('11.1 Entire Agreement. This Agreement, including all Schedules, constitutes the entire agreement between the parties regarding the subject matter herein and supersedes all prior agreements, understandings, and communications.');
addPara('11.2 Amendments. Vectarr may amend this Agreement upon thirty (30) days\' written notice. Continued use of the Platform after such notice constitutes acceptance of the amended terms.');
addPara('11.3 Severability. If any provision of this Agreement is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.');
addPara('11.4 Waiver. No waiver of any provision shall be effective unless in writing. Failure to enforce any provision shall not constitute a waiver of future enforcement.');
addPara('11.5 Assignment. Users may not assign this Agreement without Vectarr\'s prior written consent. Vectarr may assign this Agreement without restriction. This Agreement binds and benefits the parties and their permitted successors and assigns.');
addPara('11.6 Force Majeure. Neither party shall be liable for delays or failures to perform due to causes beyond its reasonable control, including acts of God, war, terrorism, labor disputes, or governmental action.');
addPara('11.7 Notices. All notices shall be in writing and delivered to the addresses on file with Vectarr, or via email to the addresses registered on the Platform.');
addPara('11.8 Headings. Section headings are for convenience only and do not affect interpretation.');
addPara('11.9 Third-Party Beneficiaries. Except as expressly stated, this Agreement does not create rights in any third party.');
addPara('11.10 Export Compliance. Users agree to comply with all U.S. export control laws and regulations.');
addPara('11.11 Relationship of Parties. Nothing in this Agreement creates a partnership, joint venture, employment, or agency relationship between the parties.');

// Signature Page
addPara('', 'Normal', {spaceBefore: 600});
addPara('SIGNATURE PAGE', 'Normal', {center: true, bold: true, color: '1F4E79', size: 28});
addPara('', 'Normal', {spaceAfter: 200});
addPara('IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.', 'Normal', {spaceAfter: 400});

addPara('VECTARR LLC', 'Normal', {bold: true, spaceBefore: 400});
addPara('By: _________________________________', 'Normal', {spaceAfter: 100});
addPara('Name: _______________________________', 'Normal', {spaceAfter: 100});
addPara('Title: ______________________________', 'Normal', {spaceAfter: 100});
addPara('Date: _______________________________', 'Normal', {spaceAfter: 400});

addPara('[COUNTERPARTY NAME]', 'Normal', {bold: true, spaceBefore: 400});
addPara('By: _________________________________', 'Normal', {spaceAfter: 100});
addPara('Name: _______________________________', 'Normal', {spaceAfter: 100});
addPara('Title: ______________________________', 'Normal', {spaceAfter: 100});
addPara('Date: _______________________________', 'Normal', {spaceAfter: 600});

// Schedules
addPara('SCHEDULE A: SERVICE LEVEL AGREEMENT', 'Heading1');
addPara('A.1 Platform Availability. Vectarr targets 99.5% monthly uptime for the Platform, excluding scheduled maintenance windows and Force Majeure events.');
addPara('A.2 Scheduled Maintenance. Vectarr may perform scheduled maintenance with at least forty-eight (48) hours advance notice. Emergency maintenance may be performed with reasonable notice.');
addPara('A.3 Support Response Times. Vectarr shall respond to support requests within: (a) four (4) hours for Critical issues (Platform unavailable); (b) eight (8) business hours for High priority issues (significant functionality impaired); (c) two (2) business days for Standard issues.');
addPara('A.4 Service Credits. If monthly uptime falls below 99.5%, Users may request a service credit equal to 5% of monthly fees for each full percentage point below 99.5%, up to a maximum of 25% of monthly fees. Service credits are User\'s sole remedy for Platform unavailability.');

addPara('SCHEDULE B: FEE SCHEDULE', 'Heading1');
addPara('B.1 Subscription Tiers. Vectarr offers the following subscription plans: (a) Basic: $99/month - Up to 10 RFQs, standard support; (b) Professional: $299/month - Unlimited RFQs, priority support, advanced analytics; (c) Enterprise: Custom pricing - Dedicated support, API access, custom integrations.');
addPara('B.2 Transaction Fees. Vectarr charges a transaction fee of 2.5% of the total Transaction value, capped at $500 per Transaction.');
addPara('B.3 Payment Processing. Payment processing fees of 2.9% + $0.30 per transaction apply to all payments processed through the Platform.');
addPara('B.4 Premium Services. Additional fees apply for: expedited RFQ processing ($25/RFQ), dedicated account management ($500/month), custom reporting ($200/report).');
addPara('B.5 Annual Billing. Users selecting annual billing receive a 15% discount compared to monthly billing.');

addPara('SCHEDULE C: DATA PROCESSING ADDENDUM', 'Heading1');
addPara('C.1 Data Processing. Vectarr processes User personal data only as necessary to provide the Platform and Services, and in accordance with applicable data protection laws.');
addPara('C.2 Data Security. Vectarr implements industry-standard security measures to protect User data, including encryption in transit and at rest, access controls, and regular security assessments.');
addPara('C.3 Data Retention. User Content is retained for the duration of the Agreement plus thirty (30) days, unless longer retention is required by law or necessary for dispute resolution.');
addPara('C.4 Data Subject Rights. Vectarr shall assist Users in responding to data subject requests (access, correction, deletion, portability) as required by applicable law.');
addPara('C.5 Subprocessors. Vectarr uses third-party service providers (cloud hosting, payment processing, analytics) as subprocessors. A current list is available upon request.');
addPara('C.6 Data Breach Notification. Vectarr shall notify Users within forty-eight (48) hours of becoming aware of any unauthorized access to User Content.');
addPara('C.7 International Transfers. User data may be processed in the United States and other jurisdictions. Vectarr implements appropriate safeguards for international data transfers.');

// Build document XML
const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${paras.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
      <w:cols w:space="720"/>
    </w:sectPr>
  </w:body>
</w:document>`;

zip.file('word/document.xml', documentXml);

// Generate the DOCX
zip.generateAsync({ type: 'nodebuffer' }).then(content => {
  const outputPath = 'Vectarr_MSA_Complete.docx';
  fs.writeFileSync(outputPath, content);
  console.log('Complete MSA created successfully: ' + outputPath);
  console.log('File size: ' + (content.length / 1024).toFixed(2) + ' KB');
}).catch(err => {
  console.error('Error creating DOCX:', err);
  process.exit(1);
});
