#!/usr/bin/env node
/**
 * Test script: Import SOA document via GraphQL mutation
 * Usage: node scripts/test-import-soa.mjs <path-to-docx>
 */
import fs from 'node:fs';
import path from 'node:path';

const API_URL = 'http://localhost:4000/graphql';
const PROJECT_ID = '9e59b262-8826-483f-9c69-fb0f9d1b2fe6';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node scripts/test-import-soa.mjs <path-to-docx-or-pdf>');
  process.exit(1);
}

const resolvedPath = path.resolve(filePath);
const ext = path.extname(resolvedPath).toLowerCase();
const fileFormat = ext === '.pdf' ? 'PDF' : 'DOCX';
const fileName = path.basename(resolvedPath);

console.log(`Reading file: ${resolvedPath} (${fileFormat})`);
const fileBuffer = fs.readFileSync(resolvedPath);
const fileContent = fileBuffer.toString('base64');
console.log(`File size: ${fileBuffer.length} bytes, base64 size: ${fileContent.length} chars`);

const mutation = `
  mutation ImportSoaDocument(
    $projectId: String!
    $fileName: String!
    $fileContent: String!
    $fileFormat: String!
  ) {
    importSoaDocument(
      projectId: $projectId
      fileName: $fileName
      fileContent: $fileContent
      fileFormat: $fileFormat
    ) {
      importId
      taskId
    }
  }
`;

console.log(`\nSending mutation to ${API_URL}...`);

try {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: mutation,
      variables: {
        projectId: PROJECT_ID,
        fileName,
        fileContent,
        fileFormat,
      },
    }),
  });

  const json = await res.json();

  if (json.errors) {
    console.error('GraphQL errors:', JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }

  const { importId, taskId } = json.data.importSoaDocument;
  console.log(`\nImport started successfully!`);
  console.log(`  importId: ${importId}`);
  console.log(`  taskId:   ${taskId}`);

  // Poll for task status
  console.log('\nPolling task status...');
  const taskQuery = `
    query GetTask($taskId: String!) {
      task(id: $taskId) {
        id
        status
        progress
        error
      }
    }
  `;

  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const taskRes = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: taskQuery,
        variables: { taskId },
      }),
    });

    const taskJson = await taskRes.json();

    if (taskJson.errors) {
      console.log(`  [${i * 5}s] Query error:`, taskJson.errors[0]?.message);
      continue;
    }

    const task = taskJson.data?.task;
    if (!task) {
      console.log(`  [${i * 5}s] Task not found yet...`);
      continue;
    }

    console.log(`  [${i * 5}s] Status: ${task.status}, Progress: ${task.progress}%`);

    if (task.status === 'COMPLETED') {
      console.log('\nTask completed! Fetching import data...');

      // Fetch the import record
      const importQuery = `
        query GetImport($importId: String!) {
          soaImport(importId: $importId) {
            id
            status
            sourceFileName
            extractedData
            gapReport
          }
        }
      `;

      const importRes = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: importQuery,
          variables: { importId },
        }),
      });

      const importJson = await importRes.json();

      if (importJson.data?.soaImport) {
        const imp = importJson.data.soaImport;
        const data = typeof imp.extractedData === 'string'
          ? JSON.parse(imp.extractedData)
          : imp.extractedData;

        console.log(`\nImport status: ${imp.status}`);
        console.log(`SOA Type: ${data?.soaType}`);
        console.log(`Articles: ${data?.articles?.length ?? 0}`);
        console.log(`Sections: ${data?.sections?.length ?? 0}`);
        console.log(`Claims: ${data?.claims?.length ?? 0}`);
        console.log(`Grid columns: ${data?.gridColumns?.length ?? 0}`);
        console.log(`Grid cells: ${data?.gridCells?.length ?? 0}`);

        const gapReport = typeof imp.gapReport === 'string'
          ? JSON.parse(imp.gapReport)
          : imp.gapReport;

        if (gapReport) {
          console.log(`\nGap Report Summary:`);
          console.log(`  Total gaps: ${gapReport.summary?.totalGaps}`);
          console.log(`  HIGH: ${gapReport.summary?.highCount}`);
          console.log(`  MEDIUM: ${gapReport.summary?.mediumCount}`);
          console.log(`  LOW: ${gapReport.summary?.lowCount}`);
          console.log(`  INFO: ${gapReport.summary?.infoCount}`);
        }
      } else {
        console.log('Could not fetch import data:', JSON.stringify(importJson, null, 2));
      }

      process.exit(0);
    }

    if (task.status === 'FAILED') {
      console.error(`\nTask failed! Error: ${task.error}`);
      process.exit(1);
    }
  }

  console.error('\nTimeout: task did not complete within 10 minutes');
  process.exit(1);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
