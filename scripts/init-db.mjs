import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const prismaDir = path.join(process.cwd(), "prisma");
const dbPath = path.join(prismaDir, "dev.db");

mkdirSync(prismaDir, { recursive: true });

const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL UNIQUE,
    nickname TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Folder (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    parentFolderId TEXT,
    title TEXT NOT NULL,
    pinnedAt DATETIME,
    sortIndex INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (parentFolderId) REFERENCES Folder(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS Project (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    folderId TEXT,
    title TEXT NOT NULL,
    artistLabel TEXT,
    releaseKind TEXT NOT NULL DEFAULT 'ALBUM',
    coverType TEXT NOT NULL DEFAULT 'GRADIENT',
    coverImageUrl TEXT,
    coverPresetKey TEXT,
    coverColorA TEXT,
    coverColorB TEXT,
    pinnedAt DATETIME,
    sortIndex INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (folderId) REFERENCES Folder(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS Track (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    title TEXT NOT NULL,
    lyricsText TEXT,
    folderId TEXT,
    projectId TEXT,
    primaryDemoId TEXT,
    pathStageId INTEGER,
    displayBpm REAL,
    displayKeyRoot TEXT,
    displayKeyMode TEXT,
    sortIndex INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (folderId) REFERENCES Folder(id) ON DELETE SET NULL,
    FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS Demo (
    id TEXT PRIMARY KEY NOT NULL,
    trackId TEXT NOT NULL,
    audioPath TEXT,
    textNote TEXT,
    duration INTEGER NOT NULL DEFAULT 0,
    releaseDate DATETIME,
    detectedBpm REAL,
    detectedKeyRoot TEXT,
    detectedKeyMode TEXT,
    versionType TEXT NOT NULL DEFAULT 'DEMO',
    sortIndex INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trackId) REFERENCES Track(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS VersionReflection (
    demoId TEXT PRIMARY KEY NOT NULL,
    whyMade TEXT,
    whatChanged TEXT,
    whatNotWorking TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (demoId) REFERENCES Demo(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS Folder_parentFolderId_idx ON Folder(parentFolderId);
  CREATE INDEX IF NOT EXISTS Folder_pinnedAt_idx ON Folder(pinnedAt);
  CREATE INDEX IF NOT EXISTS Folder_userId_parentFolderId_updatedAt_idx ON Folder(userId, parentFolderId, updatedAt);

  CREATE INDEX IF NOT EXISTS Project_userId_updatedAt_idx ON Project(userId, updatedAt);
  CREATE INDEX IF NOT EXISTS Project_folderId_idx ON Project(folderId);
  CREATE INDEX IF NOT EXISTS Project_pinnedAt_idx ON Project(pinnedAt);

  CREATE INDEX IF NOT EXISTS Track_projectId_sortIndex_idx ON Track(projectId, sortIndex);
  CREATE INDEX IF NOT EXISTS Track_folderId_sortIndex_idx ON Track(folderId, sortIndex);
  CREATE INDEX IF NOT EXISTS Track_primaryDemoId_idx ON Track(primaryDemoId);

  CREATE INDEX IF NOT EXISTS Demo_trackId_versionType_sortIndex_idx ON Demo(trackId, versionType, sortIndex);
`);

db.close();

console.log(`SQLite schema initialized at ${dbPath}`);
