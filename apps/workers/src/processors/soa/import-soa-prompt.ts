/**
 * LLM prompts for 3-phase SOA document import extraction.
 */

// --- Phase 1: Identify SOA type + extract articles ---

export function buildPhase1SystemPrompt(): string {
  return `You are an expert in medical device regulatory compliance (MDR, EU 2017/745).
You are analyzing a State of the Art (SOA) document for a Clinical Evaluation Report (CER).

Your task is to:
1. Identify the SOA type: CLINICAL (clinical evaluation), SIMILAR_DEVICE (equivalence/comparison), or ALTERNATIVE (alternative treatments).
2. Extract ALL referenced articles/publications with their bibliographic metadata.

Respond with valid JSON only.`;
}

export function buildPhase1UserPrompt(documentText: string): string {
  const truncated = documentText.slice(0, 30000);
  return `Analyze this SOA document and extract the type, all referenced articles, and the systematic literature search (SLS) sessions.

DOCUMENT:
${truncated}

Respond with this JSON structure:
{
  "soaType": "CLINICAL" | "SIMILAR_DEVICE" | "ALTERNATIVE",
  "articles": [
    {
      "tempId": "art-1",
      "title": "Full article title",
      "authors": "Author1, Author2 et al.",
      "publicationYear": 2023,
      "doi": "10.xxxx/xxxxx" or null,
      "pmid": "12345678" or null,
      "journal": "Journal Name" or null,
      "abstract": "Brief abstract if available" or null
    }
  ],
  "slsSessions": [
    {
      "type": "SOA_CLINICAL" or "SOA_DEVICE",
      "name": "Descriptive session name (e.g. 'Clinical literature search' or 'Similar device search')",
      "scopeFields": {
        // For SOA_CLINICAL: PICO fields
        "population": "Target patient population",
        "intervention": "Device or procedure under evaluation",
        "comparator": "Comparator devices or standard of care",
        "outcomes": "Primary and secondary outcomes",
        // For SOA_DEVICE: device equivalence fields
        "subjectDevice": "Device under evaluation",
        "equivalentDevices": "Claimed equivalent devices",
        "clinicalIndication": "Intended clinical use",
        "technicalCharacteristics": "Key technical specifications"
      },
      "queries": [
        {
          "name": "Query description (e.g. 'Primary clinical search')",
          "queryString": "Exact boolean query string as written in the document (e.g. '(device X OR device Y) AND (safety OR complication)')",
          "databases": ["PubMed", "Embase", "Cochrane"],
          "dateFrom": "2015-01-01" or null,
          "dateTo": "2024-12-31" or null
        }
      ],
      "exclusionCodes": [
        {
          "code": "E1",
          "label": "Short exclusion reason",
          "shortCode": "E1",
          "description": "Detailed exclusion criterion description"
        }
      ],
      "articleTempIds": ["art-1", "art-2"]
    }
  ]
}

INSTRUCTIONS:
- Use sequential tempIds: art-1, art-2, art-3, etc. Extract ALL articles mentioned in the document, including those in reference lists.
- Extract 1 or 2 SLS sessions: if the document has both a clinical evaluation part AND a similar device / equivalence part, create two sessions (SOA_CLINICAL + SOA_DEVICE). Otherwise create one.
- For scopeFields, extract the PICO framework for clinical sessions and device equivalence fields for device sessions. Only include fields that are explicitly mentioned.
- For queries, extract the exact boolean search strings as written in the document. List all databases mentioned.
- For exclusionCodes, extract inclusion/exclusion criteria coded as E1, E2, E3... from the document's selection criteria section.
- For articleTempIds, assign each article to the session it belongs to. If unclear, assign to the clinical session.
- If the document does not contain search strategy information, return empty arrays for queries and exclusionCodes.`;
}

// --- Phase 2: Extract narrative sections + claims ---

export function buildPhase2SystemPrompt(): string {
  return `You are an expert in medical device regulatory compliance (MDR, EU 2017/745).
You are extracting thematic sections and clinical claims from a State of the Art document.

Standard thematic sections for SOA:
- clinical_background: Clinical Background
- device_description: Device Description & Intended Purpose
- current_knowledge: Current Knowledge / State of the Art
- clinical_data_review: Clinical Data Review
- safety_analysis: Safety Analysis
- performance_analysis: Performance Analysis
- benefit_risk: Benefit-Risk Analysis
- conclusions: Conclusions

Respond with valid JSON only.`;
}

export function buildPhase2UserPrompt(documentText: string, soaType: string): string {
  const truncated = documentText.slice(0, 30000);
  return `Extract the thematic sections and clinical claims from this ${soaType} SOA document.

DOCUMENT:
${truncated}

Respond with this JSON structure:
{
  "sections": [
    {
      "sectionKey": "clinical_background",
      "title": "Section Title as in Document",
      "orderIndex": 0,
      "narrativeContent": "Full narrative text of the section..."
    }
  ],
  "claims": [
    {
      "statementText": "The device demonstrates equivalent safety...",
      "thematicSectionKey": "safety_analysis",
      "articleTempIds": ["art-1", "art-3"],
      "sourceQuote": "Direct quote from document supporting the claim"
    }
  ]
}

Use the standard section keys listed above. Map claims to their supporting articles using the tempIds from phase 1.`;
}

// --- Phase 3: Extract grid data + devices + quality assessments ---

export function buildPhase3SystemPrompt(): string {
  return `You are an expert in medical device regulatory compliance (MDR, EU 2017/745).
You are extracting structured data extraction grid entries, similar devices, and quality assessments from a State of the Art document.

Respond with valid JSON only.`;
}

export function buildPhase3UserPrompt(
  documentText: string,
  soaType: string,
  articleList: string,
): string {
  const truncated = documentText.slice(0, 20000);
  return `Extract grid data, similar devices, and quality assessments from this ${soaType} SOA document.

ARTICLES (from phase 1):
${articleList}

DOCUMENT:
${truncated}

Respond with this JSON structure:
{
  "gridColumns": [
    {
      "name": "study_type",
      "displayName": "Study Type",
      "dataType": "TEXT",
      "isRequired": false,
      "orderIndex": 0
    }
  ],
  "gridCells": [
    {
      "articleTempId": "art-1",
      "columnName": "study_type",
      "value": "RCT",
      "sourceQuote": "randomized controlled trial..."
    }
  ],
  "similarDevices": [
    {
      "deviceName": "Device X",
      "manufacturer": "Company Y",
      "indication": "Treatment of...",
      "regulatoryStatus": "CE marked, Class IIa",
      "benchmarks": [
        {
          "metricName": "Complication Rate",
          "metricValue": "2.3%",
          "unit": "%",
          "sourceDescription": "From Smith et al. 2022"
        }
      ]
    }
  ],
  "qualityAssessments": [
    {
      "articleTempId": "art-1",
      "assessmentType": "QUADAS_2",
      "assessmentData": {
        "patientSelection": { "risk": "LOW", "concern": "LOW" },
        "indexTest": { "risk": "LOW", "concern": "LOW" },
        "referenceStandard": { "risk": "LOW", "concern": "LOW" },
        "flowAndTiming": { "risk": "UNCLEAR" }
      },
      "dataContributionLevel": "PIVOTAL"
    }
  ]
}

For gridColumns, create columns based on the data present in the document. Common columns:
- study_type, sample_size, population, intervention, comparator, primary_outcome, secondary_outcomes, follow_up, main_results, safety_data, limitations

Only include similarDevices if this is a SIMILAR_DEVICE type SOA.
For qualityAssessments, assess each key article that contributes significantly to the analysis.`;
}
