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
  <dc:title>Vectarr LLC - Master Contractor Agreement</dc:title>
  <dc:subject>Machine Shop Partner Agreement</dc:subject>
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
  <Pages>14</Pages>
  <Words>6200</Words>
  <Characters>35000</Characters>
  <Application>Microsoft Office Word</Application>
  <DocSecurity>0</DocSecurity>
  <Lines>280</Lines>
  <Paragraphs>135</Paragraphs>
  <ScaleCrop>false</ScaleCrop>
  <Company>Vectarr LLC</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <CharactersWithSpaces>41000</CharactersWithSpaces>
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
addPara('Master Contractor Agreement', 'Subtitle');
addPara('', 'Normal', {spaceAfter: 400});
addPara('Effective Date: Upon Execution', 'Normal', {center: true, color: '404040', size: 22});
addPara('Version 1.0 | www.vectarr.com', 'Normal', {center: true, color: '404040', size: 22});
addPara('', 'Normal', {spaceAfter: 600});

// Intro
addPara('THIS MASTER CONTRACTOR AGREEMENT (the "Agreement") is entered into as of the date of last signature below (the "Effective Date"), by and between VECTARR LLC, a Texas limited liability company with its principal place of business in Austin, Texas ("Vectarr"), and the machine shop, manufacturer, or fabrication services provider identified in the signature block below ("Contractor" or "Machine Shop").', 'Normal', {spaceAfter: 200});

addPara('RECITALS', 'Normal', {bold: true, spaceBefore: 200, spaceAfter: 100});
addPara('WHEREAS, Vectarr operates an online marketplace platform connecting customers seeking manufacturing services with qualified machine shops and fabricators; and', 'Normal', {spaceAfter: 100});
addPara('WHEREAS, Contractor represents that it has the capability, equipment, expertise, and personnel to perform manufacturing services for Vectarr customers; and', 'Normal', {spaceAfter: 100});
addPara('WHEREAS, Vectarr desires to engage Contractor, and Contractor desires to be engaged by Vectarr, to provide manufacturing services through the Vectarr platform, subject to the terms and conditions set forth herein;', 'Normal', {spaceAfter: 200});
addPara('NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the parties agree as follows:', 'Normal', {spaceAfter: 200});

// Section 1
addHeading(1, '1. DEFINITIONS');
addPara('1.1 "Customer" means any individual or entity that submits a Request for Quotation (RFQ) through the Vectarr Platform.');
addPara('1.2 "Deliverables" means all manufactured parts, components, assemblies, and related documentation produced by Contractor pursuant to a Work Order.');
addPara('1.3 "Intellectual Property" means all patents, copyrights, trademarks, trade secrets, know-how, and other proprietary rights.');
addPara('1.4 "Platform" means the Vectarr online marketplace accessible at www.vectarr.com and associated applications.');
addPara('1.5 "Quality Standards" means the quality control and manufacturing standards set forth in Schedule A, industry standards (including ISO 9001 where applicable), and Customer specifications.');
addPara('1.6 "Quote" means a written pricing proposal submitted by Contractor in response to a Customer RFQ.');
addPara('1.7 "Work Order" means a binding purchase order issued by Vectarr or a Customer through the Platform based on an accepted Quote.');
addPara('1.8 "Specifications" means the technical drawings, CAD files, materials requirements, tolerances, and other requirements provided by the Customer and accepted by Contractor.');

// Section 2
addHeading(1, '2. ENGAGEMENT AND SERVICES');
addPara('2.1 Engagement. Vectarr engages Contractor as an independent contractor, and Contractor agrees to provide manufacturing services to Vectarr Customers through the Platform. This Agreement does not create an employment, partnership, joint venture, or agency relationship.');
addPara('2.2 Independent Contractor Status. Contractor is an independent contractor and not an employee of Vectarr. Contractor shall be solely responsible for all taxes, insurance, benefits, and compliance with all applicable laws relating to Contractor\'s personnel.');
addPara('2.3 Services. Contractor shall manufacture, fabricate, machine, finish, and deliver parts and components in accordance with accepted Work Orders, Specifications, Quality Standards, and this Agreement.');
addPara('2.4 No Exclusivity. This Agreement does not grant exclusivity to either party. Contractor may provide services to other customers, and Vectarr may engage other machine shops. However, Contractor shall not use confidential information obtained through the Platform to compete with Vectarr.');
addPara('2.5 Subcontracting. Contractor may not subcontract any Work Order without prior written consent from Vectarr. Contractor remains fully liable for the acts and omissions of any subcontractors.');

// Section 3
addHeading(1, '3. QUOTATION AND WORK ORDER PROCESS');
addPara('3.1 RFQ Review. Contractor shall review RFQs submitted through the Platform and may submit Quotes for Work Orders Contractor is qualified and equipped to perform.');
addPara('3.2 Quote Requirements. All Quotes shall be: (a) accurate and complete; (b) based on the Specifications provided; (c) inclusive of all costs, including materials, labor, overhead, finishing, packaging, and shipping; (d) valid for the period specified in the RFQ or thirty (30) days if not specified.');
addPara('3.3 Quote Binding. Upon acceptance of a Quote by a Customer through the Platform, Contractor is bound to perform the Work Order at the quoted price and timeline. Contractor may not increase prices or extend delivery dates except as provided in Section 3.5.');
addPara('3.4 Work Order Formation. A binding Work Order is formed when: (a) Contractor submits a Quote; (b) the Customer accepts the Quote through the Platform; and (c) payment or deposit is secured as required by Vectarr\'s payment terms.');
addPara('3.5 Specification Changes. If a Customer requests changes to Specifications after Work Order acceptance, Contractor may submit a Change Order Quote within forty-eight (48) hours. If Customer accepts the Change Order, the Work Order is modified accordingly. If Contractor fails to submit a Change Order Quote within forty-eight (48) hours, Contractor shall complete the Work Order as originally specified.');
addPara('3.6 Quote Withdrawal. Contractor may withdraw a Quote prior to Customer acceptance by written notice through the Platform. Once accepted, withdrawal is only permitted as provided in Section 9.');

// Section 4
addHeading(1, '4. PERFORMANCE OBLIGATIONS');
addPara('4.1 Acceptance of Work Orders. Contractor shall accept or decline RFQs within the time period specified in the RFQ or, if no time is specified, within forty-eight (48) hours of RFQ submission.');
addPara('4.2 Production Standards. Contractor shall manufacture all Deliverables: (a) in accordance with the Specifications; (b) in compliance with Quality Standards; (c) using materials specified or approved by the Customer; (d) with workmanship consistent with industry standards for precision manufacturing.');
addPara('4.3 Delivery. Contractor shall deliver Deliverables by the delivery date specified in the Work Order ("Delivery Date"). Time is of the essence. If Contractor anticipates any delay, Contractor shall immediately notify Vectarr and Customer through the Platform.');
addPara('4.4 Shipping and Risk of Loss. Contractor is responsible for proper packaging, labeling, and shipping. Risk of loss passes to Customer upon delivery to the carrier or Customer\'s designated receiving location, as specified in the Work Order.');
addPara('4.5 Documentation. Contractor shall provide: (a) packing slips with each shipment; (b) certificates of conformance or material certifications as requested; (c) inspection reports for critical dimensions if specified in the Work Order; (d) any other documentation required by the Specifications.');
addPara('4.6 Inspection and Acceptance. Customer shall have fifteen (15) business days from delivery to inspect Deliverables and notify Vectarr of any non-conformance. If no notice is given within fifteen (15) business days, Deliverables are deemed accepted. Acceptance does not waive claims for latent defects discoverable through reasonable inspection.');
addPara('4.7 Correction of Non-Conformances. If Deliverables fail to meet Specifications or Quality Standards, Contractor shall, at Vectarr\'s election: (a) promptly repair or replace the non-conforming Deliverables at Contractor\'s expense; or (b) refund all amounts paid for the non-conforming Deliverables. Contractor is responsible for all shipping costs associated with repair or replacement.');

// Section 5
addHeading(1, '5. PRICING AND PAYMENT');
addPara('5.1 Pricing. Prices are as specified in the accepted Quote. Contractor warrants that quoted prices are competitive and do not exceed prices charged to other customers for similar work.');
addPara('5.2 Platform Commission. Vectarr charges a commission on each Work Order as specified in Schedule B. The commission is deducted from payments to Contractor unless otherwise agreed in writing.');
addPara('5.3 Payment Terms. Vectarr shall pay Contractor within fifteen (15) business days of: (a) Customer acceptance of Deliverables; or (b) expiration of the inspection period without rejection. Vectarr may withhold payment pending resolution of any quality disputes.');
addPara('5.4 Setoff. Vectarr may set off against any amounts owed to Contractor: (a) any amounts owed by Contractor to Vectarr; (b) costs incurred due to Contractor\'s non-conformance; (c) warranty claims; or (d) chargebacks from Customers.');
addPara('5.5 Late Payment. If Vectarr fails to pay amounts properly invoiced within forty-five (45) days of the payment due date, Contractor may charge interest at the rate of 1.5% per month (18% per annum) or the maximum rate permitted by law, whichever is less.');
addPara('5.6 Taxes. Prices include all applicable taxes unless otherwise specified. Contractor is responsible for all taxes on its income, employment taxes, and business licenses.');

// Section 6
addHeading(1, '6. WARRANTIES');
addPara('6.1 Quality Warranty. Contractor warrants that all Deliverables shall: (a) conform to the Specifications in all material respects; (b) be free from defects in materials and workmanship; (c) be manufactured in accordance with applicable laws and regulations; (d) not infringe any third-party intellectual property rights.');
addPara('6.2 Warranty Period. The warranty period is twelve (12) months from the date of acceptance of Deliverables by Customer. Extended warranties may be offered as specified in the Quote.');
addPara('6.3 Warranty Remedies. Upon breach of warranty, Contractor shall, at Vectarr\'s option: (a) repair or replace the defective Deliverables; (b) refund the purchase price; or (c) provide a credit for future Work Orders. Contractor shall bear all costs of warranty fulfillment, including shipping.');
addPara('6.4 DISCLAIMER. EXCEPT AS EXPRESSLY STATED IN THIS SECTION 6, CONTRACTOR MAKES NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING ANY IMPLIED WARRANTIES OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE. VECTARR MAKES NO WARRANTIES REGARDING CUSTOMER PAYMENT OR VOLUME OF WORK ORDERS.');

// Section 7
addHeading(1, '7. INTELLECTUAL PROPERTY');
addPara('7.1 Customer IP. All Specifications, drawings, CAD files, and related materials provided by Customers remain the property of the Customer. Contractor shall not use Customer IP for any purpose other than fulfilling the applicable Work Order, nor shall Contractor disclose Customer IP to any third party.');
addPara('7.2 Contractor IP. Contractor retains ownership of its general manufacturing processes, tooling designs (unless specifically developed for a Customer and paid for by Customer), and proprietary techniques. Contractor grants Customer a perpetual, royalty-free license to use any Contractor IP embedded in Deliverables.');
addPara('7.3 Custom Tooling. If Contractor develops custom tooling specifically for a Customer\'s Work Order and the Work Order specifies that tooling costs are separately invoiced, ownership of such tooling shall be as specified in the Work Order. If not specified, Contractor retains ownership but shall maintain the tooling for Customer reorders for twenty-four (24) months.');
addPara('7.4 Infringement Indemnity. Contractor shall defend, indemnify, and hold harmless Vectarr and Customers from any claims that Deliverables infringe any patent, copyright, trademark, or trade secret, provided that Contractor is promptly notified and given control of the defense. Contractor shall pay all damages, costs, and attorneys\' fees awarded in such claims.');

// Section 8
addHeading(1, '8. CONFIDENTIALITY');
addPara('8.1 Confidential Information. "Confidential Information" means all non-public information disclosed by Vectarr, Customers, or Contractor, including technical data, business plans, customer lists, pricing, and proprietary processes.');
addPara('8.2 Obligations. Each party agrees to: (a) hold Confidential Information in strict confidence; (b) use Confidential Information only for purposes of this Agreement; (c) disclose only to employees and subcontractors with a need to know who are bound by confidentiality obligations; (d) protect Confidential Information with at least the same degree of care used to protect its own confidential information, but no less than reasonable care.');
addPara('8.3 Exceptions. Confidentiality obligations do not apply to information that: (a) is or becomes publicly available through no breach of this Agreement; (b) was rightfully known prior to disclosure; (c) is rightfully received from a third party without restriction; or (d) is independently developed without use of Confidential Information.');
addPara('8.4 Duration. Confidentiality obligations survive termination of this Agreement for a period of five (5) years.');

// Section 9
addHeading(1, '9. TERM AND TERMINATION');
addPara('9.1 Term. This Agreement commences on the Effective Date and continues for an initial term of one (1) year, automatically renewing for successive one (1) year periods unless terminated as provided herein.');
addPara('9.2 Termination for Convenience. Either party may terminate this Agreement without cause upon ninety (90) days\' prior written notice.');
addPara('9.3 Termination for Cause. Either party may terminate this Agreement immediately upon written notice if: (a) the other party materially breaches this Agreement and fails to cure within thirty (30) days of written notice; (b) the other party becomes insolvent, files for bankruptcy, or ceases business operations; (c) Contractor fails to meet Quality Standards repeatedly or commits fraud.');
addPara('9.4 Effect of Termination. Upon termination: (a) Contractor shall complete all accepted Work Orders unless otherwise directed by Vectarr; (b) Contractor shall return all Customer materials and Confidential Information; (c) Vectarr shall pay all undisputed amounts owed for completed Work Orders; (d) Sections 6, 7, 8, 10, and 11 survive termination.');
addPara('9.5 Work in Progress. If terminated, Contractor shall be compensated for Work in Progress that conforms to Specifications and cannot be used by Contractor for other purposes, at a fair price not exceeding the Work Order price prorated for completion percentage.');

// Section 10
addHeading(1, '10. INDEMNIFICATION AND LIABILITY');
addPara('10.1 Contractor Indemnity. Contractor shall defend, indemnify, and hold harmless Vectarr, its affiliates, officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys\' fees) arising from: (a) Contractor\'s breach of this Agreement; (b) negligent or willful acts or omissions of Contractor or its personnel; (c) non-conforming Deliverables; (d) injury to persons or damage to property caused by Contractor\'s operations; (e) violation of applicable laws by Contractor; (f) infringement of intellectual property rights by Deliverables.');
addPara('10.2 Insurance. Contractor shall maintain the following insurance coverage at its own expense: (a) General Liability insurance with limits of not less than $1,000,000 per occurrence and $2,000,000 aggregate; (b) Products Liability insurance with limits of not less than $1,000,000 per occurrence; (c) Workers\' Compensation insurance as required by law; (d) Cyber Liability insurance with limits of not less than $500,000 if Contractor maintains Customer data. Certificates of insurance shall be provided to Vectarr upon request.');
addPara('10.3 LIMITATION OF LIABILITY. TO THE MAXIMUM EXTENT PERMITTED BY LAW: (A) VECTARR\'S TOTAL LIABILITY SHALL NOT EXCEED THE TOTAL AMOUNT PAID TO CONTRACTOR UNDER THIS AGREEMENT IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM; AND (B) IN NO EVENT SHALL VECTARR BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS OR BUSINESS INTERRUPTION.');
addPara('10.4 Essential Purpose. THE LIMITATIONS IN SECTION 10.3 APPLY REGARDLESS OF THE FORM OF ACTION AND SURVIVE TERMINATION.');

// Section 11
addHeading(1, '11. GENERAL PROVISIONS');
addPara('11.1 Governing Law. This Agreement is governed by the laws of the State of Texas, without regard to conflict of laws principles.');
addPara('11.2 Dispute Resolution. Any dispute shall first be subject to non-binding mediation in Austin, Texas. If mediation fails, disputes shall be resolved in the state or federal courts of Travis County, Texas. The prevailing party is entitled to recover reasonable attorneys\' fees and costs.');
addPara('11.3 Entire Agreement. This Agreement, including Schedules, constitutes the entire agreement between the parties and supersedes all prior agreements.');
addPara('11.4 Amendments. Vectarr may amend this Agreement upon thirty (30) days\' notice. Continued participation constitutes acceptance.');
addPara('11.5 Severability. If any provision is held invalid, the remaining provisions continue in full force.');
addPara('11.6 Waiver. No waiver is effective unless in writing. Failure to enforce does not constitute waiver.');
addPara('11.7 Assignment. Contractor may not assign this Agreement without Vectarr\'s prior written consent. Vectarr may assign without restriction.');
addPara('11.8 Notices. All notices shall be in writing and delivered to the addresses on file with Vectarr.');
addPara('11.9 Force Majeure. Neither party is liable for delays caused by events beyond reasonable control.');
addPara('11.10 Export Control. Contractor shall comply with all U.S. export control laws.');
addPara('11.11 Headings. Headings are for convenience only and do not affect interpretation.');
addPara('11.12 Counterparts. This Agreement may be executed in counterparts, each constituting an original.');

// Signature Page
addPara('', 'Normal', {spaceBefore: 600});
addPara('SIGNATURE PAGE', 'Normal', {center: true, bold: true, color: '1F4E79', size: 28});
addPara('', 'Normal', {spaceAfter: 200});
addPara('IN WITNESS WHEREOF, the parties have executed this Agreement as of the dates set forth below.', 'Normal', {spaceAfter: 400});

addPara('VECTARR LLC', 'Normal', {bold: true, spaceBefore: 400});
addPara('By: _________________________________', 'Normal', {spaceAfter: 100});
addPara('Name: _______________________________', 'Normal', {spaceAfter: 100});
addPara('Title: ______________________________', 'Normal', {spaceAfter: 100});
addPara('Date: _______________________________', 'Normal', {spaceAfter: 400});

addPara('CONTRACTOR:', 'Normal', {bold: true, spaceBefore: 400});
addPara('Legal Entity Name: ________________________________', 'Normal', {spaceAfter: 100});
addPara('By: _________________________________', 'Normal', {spaceAfter: 100});
addPara('Name: _______________________________', 'Normal', {spaceAfter: 100});
addPara('Title: ______________________________', 'Normal', {spaceAfter: 100});
addPara('Date: _______________________________', 'Normal', {spaceAfter: 400});
addPara('Business Address: ___________________________________', 'Normal', {spaceAfter: 100});
addPara('Federal Tax ID: _____________________________________', 'Normal', {spaceAfter: 100});
addPara('Primary Contact Email: ______________________________', 'Normal', {spaceAfter: 600});

// SCHEDULES
addPara('SCHEDULE A: QUALITY STANDARDS', 'Heading1');
addPara('A.1 General Quality Requirements. All Deliverables shall meet or exceed the following standards:');
addPara('(a) Dimensional tolerances as specified in the Work Order or, if not specified, +/- 0.005" for machined features;');
addPara('(b) Surface finish requirements as specified or industry standard for the material and process;');
addPara('(c) Material certifications provided when specified in the Work Order;');
addPara('(d) No visible defects, burrs, sharp edges, or contamination;');
addPara('(e) Proper packaging to prevent damage during transit.');
addPara('A.2 Inspection. Contractor shall inspect all Deliverables before shipment using calibrated measuring equipment appropriate for the tolerances specified.');
addPara('A.3 Non-Conformance Rate. Contractor shall maintain a non-conformance rate of less than 2% of delivered parts. Exceeding this threshold may result in suspension from the Platform pending corrective action.');
addPara('A.4 Corrective Action. Upon quality failures, Contractor shall submit a corrective action report within five (5) business days detailing root cause and preventive measures.');

addPara('SCHEDULE B: FEE SCHEDULE', 'Heading1');
addPara('B.1 Platform Commission. Vectarr charges the following commission on Work Orders:');
addPara('(a) Standard Commission: 7.5% of the total Work Order value (excluding shipping and taxes);');
addPara('(b) Preferred Partner Rate: 5.0% for Contractors maintaining 95%+ on-time delivery and <1% non-conformance for six (6) consecutive months;');
addPara('(c) Enterprise Volume Rate: Custom negotiated rate for Contractors exceeding $100,000 in monthly billings.');
addPara('B.2 Payment Processing Fee. A payment processing fee of 2.9% + $0.30 per transaction applies to all payments.');
addPara('B.3 Expedited RFQ Fee. Contractor may be charged $15 per expedited RFQ response if response is required within 24 hours.');
addPara('B.4 Dispute Resolution Fee. If Contractor disputes a Customer claim and the dispute is resolved in Customer\'s favor, Contractor shall pay a $50 dispute processing fee.');

addPara('SCHEDULE C: ACCEPTABLE CAPABILITIES', 'Heading1');
addPara('C.1 By registering on the Platform, Contractor represents that it maintains capability in at least one of the following categories:');
addPara('(a) CNC Machining (3-axis, 4-axis, or 5-axis milling; CNC turning);');
addPara('(b) Sheet Metal Fabrication (laser cutting, punching, bending, welding);');
addPara('(c) Additive Manufacturing (FDM, SLA, SLS, DMLS, or equivalent);');
addPara('(d) Injection Molding (prototype or production tooling);');
addPara('(e) Casting (die casting, investment casting, sand casting);');
addPara('(f) Finishing Services (anodizing, powder coating, plating, heat treating);');
addPara('(g) Other manufacturing processes as approved by Vectarr.');
addPara('C.2 Equipment Verification. Vectarr may request proof of equipment ownership or capability verification at any time.');
addPara('C.3 Geographical Service Area. Contractor shall specify its shipping capabilities and geographical service areas in its Platform profile.');

addPara('SCHEDULE D: PERFORMANCE METRICS', 'Heading1');
addPara('D.1 Key Performance Indicators. Contractor performance shall be measured against the following KPIs:');
addPara('(a) On-Time Delivery Rate: Target 95%, Minimum acceptable 90%;');
addPara('(b) Quality Acceptance Rate: Target 98%, Minimum acceptable 95%;');
addPara('(c) Quote Response Time: Average within 24 hours for standard RFQs;');
addPara('(d) Customer Satisfaction Rating: Minimum 4.0 out of 5.0 stars;');
addPara('(e) Communication Response Time: Within 8 business hours during Work Order fulfillment.');
addPara('D.2 Performance Reviews. Vectarr shall review Contractor performance quarterly. Failure to meet minimum KPIs for two consecutive quarters may result in suspension or termination.');
addPara('D.3 Improvement Plans. Contractors failing to meet KPIs may be required to submit and execute a Performance Improvement Plan acceptable to Vectarr.');

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
  const outputPath = 'Vectarr_Master_Contractor_Agreement.docx';
  fs.writeFileSync(outputPath, content);
  console.log('Master Contractor Agreement created: ' + outputPath);
  console.log('File size: ' + (content.length / 1024).toFixed(2) + ' KB');
}).catch(err => {
  console.error('Error creating DOCX:', err);
  process.exit(1);
});
