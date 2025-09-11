/**
 * Manual Import Test
 * ------------------
 * Führt einen Importlauf für AddressBlocks aus und löst absichtlich einen Fehler aus,
 * um zu prüfen, ob die Transaktion korrekt zurückgerollt wird.
 * Zusätzlich: Direkter PG-Connection-Test zur Debugging-Hilfe.
 */

import 'module-alias/register'; // Alias-Auflösung zuerst
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { CspAddressBlockImportService } from '../src/application/services/import/csp/address-block-import.service';
import { AddressBlock } from '../src/infrastructure/database/csp/address-block.entity';
import { Client } from 'pg';

// .env im Backend-Ordner laden
dotenv.config({ path: __dirname + '/../.env' });

async function main(): Promise<void> {
  console.log('DB_PASSWORD (ENV, raw):', JSON.stringify(process.env.DB_PASSWORD));

  // Direktverbindung zur DB testen (ohne TypeORM)
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await client.connect();
    console.log('✅ Direkter PG-Connect erfolgreich mit gegebenen ENV-Variablen');
  } catch (err) {
    console.error('❌ Direkter PG-Connect fehlgeschlagen:', err);
    process.exit(1); // Abbrechen, wenn schon hier kein Connect geht
  } finally {
    await client.end();
  }

  // Anwendungskontext starten (ohne HTTP-Server)
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const importService = app.get(CspAddressBlockImportService);
    const dataSource = app.get(DataSource);
    const repo = dataSource.getRepository(AddressBlock);

    const beforeCount = await repo.count();
    console.log(`Vorher: ${beforeCount} AddressBlocks`);

    try {
      // ⚠️ Simulierter Fehler beim Import, ausgelöst nach erstem Fortschritt
      await importService.importAddressBlocks({
        onProgress: (cur, tot) => {
          console.log(`Progress: ${cur}/${tot}`);
          if (cur > 0) {
            throw new Error('Simulierter Fehler während Import');
          }
        },
      });
    } catch (err) {
      console.error(
        'Import ist fehlgeschlagen wie erwartet:',
        err instanceof Error ? err.message : String(err),
      );
    }

    const afterCount = await repo.count();
    console.log(`Nachher: ${afterCount} AddressBlocks`);

    if (beforeCount === afterCount) {
      console.log('✅ Transaktion wurde korrekt zurückgerollt – keine Teilzustände gespeichert.');
    } else {
      console.warn('⚠️ Achtung: Datensätze haben sich geändert, Rollback evtl. nicht wie erwartet.');
    }
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error('Testlauf fehlgeschlagen:', e);
  process.exit(1);
});
