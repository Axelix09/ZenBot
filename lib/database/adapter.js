import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { addXP, updateRole } from './userCore.js';
import { ZenConfig } from '../../zen.config.js';
import { isDeepStrictEqual } from 'node:util';
import { User as MongoUser } from './user.js';
import { Group as MongoGroup } from './group.js';
import { makePublicUserId } from './publicId.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localDbDir = path.join(__dirname, 'sqlite');
const sqlitePath = path.join(localDbDir, 'zenbot.sqlite');

let sqliteDb = null;
let mongoConnected = false;

function getSQLite() {
  if (sqliteDb) return sqliteDb;
  if (!fs.existsSync(localDbDir)) {
    fs.mkdirSync(localDbDir, { recursive: true });
  }
  sqliteDb = new Database(sqlitePath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('synchronous = NORMAL');
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, data TEXT);
    CREATE TABLE IF NOT EXISTS groups (id TEXT PRIMARY KEY, data TEXT);
  `);
  return sqliteDb;
}

export async function connectDatabase() {
  mongoConnected = false;

  if (!process.env.MONGODB_URI) {
    getSQLite();
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    mongoConnected = true;
  } catch {
    getSQLite();
  }
}

export function isMongoConnected() {
  return mongoConnected;
}

export function getEngineName() {
  return mongoConnected ? 'MDB Cloud' : 'SQLite Local';
}

function getPath(obj, keyPath) {
  return keyPath.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

const valuesMatch = (actual, expected) => {
  if (Array.isArray(actual) && !Array.isArray(expected)) {
    return actual.some((item) => isDeepStrictEqual(item, expected));
  }
  return isDeepStrictEqual(actual, expected);
};

function matchesFieldCondition(value, condition) {
  if (condition instanceof RegExp) {
    const regex = new RegExp(condition.source, condition.flags);
    return (Array.isArray(value) ? value : [value]).some((item) => regex.test(String(item ?? '')));
  }

  const isOperatorObject = condition && typeof condition === 'object' && !Array.isArray(condition) &&
    Object.keys(condition).some((key) => key.startsWith('$'));
  if (!isOperatorObject) return valuesMatch(value, condition);

  if ('$regex' in condition) {
    const pattern = condition.$regex;
    const regex = pattern instanceof RegExp
      ? new RegExp(pattern.source, pattern.flags)
      : new RegExp(String(pattern), condition.$options || '');
    if (!(Array.isArray(value) ? value : [value]).some((item) => regex.test(String(item ?? '')))) return false;
  }

  for (const [operator, operand] of Object.entries(condition)) {
    switch (operator) {
      case '$regex':
      case '$options':
        break;
      case '$eq':
        if (!valuesMatch(value, operand)) return false;
        break;
      case '$ne':
        if (valuesMatch(value, operand)) return false;
        break;
      case '$gt':
        if (!(value > operand)) return false;
        break;
      case '$gte':
        if (!(value >= operand)) return false;
        break;
      case '$lt':
        if (!(value < operand)) return false;
        break;
      case '$lte':
        if (!(value <= operand)) return false;
        break;
      case '$exists':
        if ((value !== undefined) !== Boolean(operand)) return false;
        break;
      case '$in':
        if (!Array.isArray(operand) || !operand.some((item) => valuesMatch(value, item) || (item instanceof RegExp && item.test(String(value ?? ''))))) return false;
        break;
      case '$nin':
        if (!Array.isArray(operand) || operand.some((item) => valuesMatch(value, item) || (item instanceof RegExp && item.test(String(value ?? ''))))) return false;
        break;
      default:
        return false;
    }
  }
  return true;
}

function matchesFilter(doc, filter = {}) {
  for (const key of Object.keys(filter)) {
    const condition = filter[key];
    if (key === '$or') {
      if (!Array.isArray(condition) || !condition.some((branch) => matchesFilter(doc, branch))) return false;
      continue;
    }
    if (key === '$and') {
      if (!Array.isArray(condition) || !condition.every((branch) => matchesFilter(doc, branch))) return false;
      continue;
    }
    if (key === '$nor') {
      if (!Array.isArray(condition) || condition.some((branch) => matchesFilter(doc, branch))) return false;
      continue;
    }
    const value = getPath(doc, key);
    if (!matchesFieldCondition(value, condition)) return false;
  }
  return true;
}

const normalizeSort = (sort) => {
  if (typeof sort === 'string') {
    return sort.trim().split(/\s+/).filter(Boolean).map((field) => [field.replace(/^-/, ''), field.startsWith('-') ? -1 : 1]);
  }
  if (!sort || typeof sort !== 'object' || Array.isArray(sort)) return [];
  return Object.entries(sort).map(([field, direction]) => [
    field,
    direction === -1 || ['desc', 'descending'].includes(String(direction).toLowerCase()) ? -1 : 1
  ]);
};

class LocalQuery {
  constructor(executor) {
    this.executor = executor;
    this.options = { sort: null, skip: 0, limit: null };
  }

  sort(specification) {
    this.options.sort = specification;
    return this;
  }

  skip(count) {
    const value = Number(count);
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('skip debe ser un entero no negativo');
    this.options.skip = value;
    return this;
  }

  limit(count) {
    const value = Number(count);
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('limit debe ser un entero no negativo');
    this.options.limit = value === 0 ? null : value;
    return this;
  }

  lean() {
    return this;
  }

  exec() {
    return Promise.resolve().then(() => this.executor({ ...this.options }));
  }

  then(onFulfilled, onRejected) {
    return this.exec().then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    return this.exec().catch(onRejected);
  }

  finally(onFinally) {
    return this.exec().finally(onFinally);
  }
}

function applyUpdateOperators(doc, update) {
  if (update.$set) {
    Object.assign(doc, update.$set);
  }
  if (update.$inc) {
    for (const keyPath of Object.keys(update.$inc)) {
      const parts = keyPath.split('.');
      let target = doc;
      for (let i = 0; i < parts.length - 1; i++) {
        if (typeof target[parts[i]] !== 'object' || target[parts[i]] === null) target[parts[i]] = {};
        target = target[parts[i]];
      }
      const last = parts[parts.length - 1];
      target[last] = (target[last] || 0) + update.$inc[keyPath];
    }
  }
  if (update.$unset) {
    for (const keyPath of Object.keys(update.$unset)) {
      const parts = keyPath.split('.');
      let target = doc;
      for (let i = 0; i < parts.length - 1; i++) {
        if (target[parts[i]] == null) { target = null; break; }
        target = target[parts[i]];
      }
      if (target) delete target[parts[parts.length - 1]];
    }
  }
}

const USER_DEFAULTS = (data = {}) => ({
  id: data.id,
  userId: data.userId || makePublicUserId(data.id),
  name: data.name || 'Sin Nombre',
  nickname: data.nickname ?? null,
  bio: data.bio || `Explorando junto a ${ZenConfig.botName}. ✨`,
  status: data.status ?? null,
  location: data.location ?? null,
  age: data.age ?? null,
  gender: data.gender ?? null,
  registered: data.registered ?? false,
  hadRegistered: data.hadRegistered ?? false,
  xp: data.xp || 0,
  level: data.level || 1,
  role: data.role || '🌱 Iniciado V',
  zencoins: data.zencoins ?? 100,
  kogen: data.kogen ?? 0,
  streak: data.streak ?? 0,
  maxStreak: data.maxStreak ?? 0,
  lastActivity: data.lastActivity ?? null,
  streakPet: {
    species: data.streakPet?.species || 'lobo',
    activated: data.streakPet?.activated ?? false,
    hatched: data.streakPet?.hatched ?? false,
    stage: data.streakPet?.stage || 'egg',
    nickname: data.streakPet?.nickname ?? null,
    hatchedAt: data.streakPet?.hatchedAt ?? null
  },
  titles: data.titles || [],
  activeTitle: data.activeTitle ?? null,
  marriedWith: data.marriedWith || null,
  marriedSince: data.marriedSince ?? null,
  protectionUntil: data.protectionUntil ?? null,
  proposal: data.proposal || { from: null, name: null, at: null },
  cooldowns: data.cooldowns || {},
  config: data.config || { levelNotifications: true },
  loans: {
    active: data.loans?.active ?? false,
    amount: data.loans?.amount ?? 0,
    interest: data.loans?.interest ?? 0,
    totalDebt: data.loans?.totalDebt ?? 0,
    takenAt: data.loans?.takenAt ?? null,
    dueDate: data.loans?.dueDate ?? null,
    paymentHistory: data.loans?.paymentHistory || [],
    latePayments: data.loans?.latePayments ?? 0,
    maxCredit: data.loans?.maxCredit ?? 5000,
    trustScore: data.loans?.trustScore ?? 50,
    isBlocked: data.loans?.isBlocked ?? false,
    blockedReason: data.loans?.blockedReason ?? null,
    blockedPermanently: data.loans?.blockedPermanently ?? false,
    promiseDate: data.loans?.promiseDate ?? null,
    promiseAmount: data.loans?.promiseAmount ?? 0,
    isPromised: data.loans?.isPromised ?? false,
    lastInterestApplied: data.loans?.lastInterestApplied ?? null,
    interestAccumulated: data.loans?.interestAccumulated ?? 0,
    gracePeriodUsed: data.loans?.gracePeriodUsed ?? false,
    canBeUnblocked: data.loans?.canBeUnblocked ?? false
  },
  acWins: data.acWins ?? 0,
  acLosses: data.acLosses ?? 0,
  acEarned: data.acEarned ?? 0,
  acRacha: data.acRacha ?? 0,
  acMaxRacha: data.acMaxRacha ?? 0,
  ahWins: data.ahWins ?? 0,
  ahLosses: data.ahLosses ?? 0,
  ahEarned: data.ahEarned ?? 0,
  mathWins: data.mathWins ?? 0,
  mathLosses: data.mathLosses ?? 0,
  mathEarned: data.mathEarned ?? 0,
  mathFacil: data.mathFacil ?? 0,
  mathMedio: data.mathMedio ?? 0,
  mathDificil: data.mathDificil ?? 0,
  mathImposible: data.mathImposible ?? 0,
  pptWins: data.pptWins ?? 0,
  pptLosses: data.pptLosses ?? 0,
  pptDraws: data.pptDraws ?? 0,
  pptEarned: data.pptEarned ?? 0,
  tvWins: data.tvWins ?? 0,
  tvLosses: data.tvLosses ?? 0,
  tvEarned: data.tvEarned ?? 0,
  tvLost: data.tvLost ?? 0,
  tvMaxRacha: data.tvMaxRacha ?? 0,
  tvCatStats: data.tvCatStats || {},
  stats: {
    dicesThrown: 0, actionsSent: 0, commandsUsed: 0,
    zencoinsMined: 0, robsWon: 0, robsLost: 0, timesRobbed: 0,
    totalStolenByMe: 0, totalStolenFromMe: 0, maxZenCoinsRecord: 0, maxTransferReceived: 0,
    maxFishWeight: 0, maxFishName: null, messagesByGroup: {},
    tttWins: 0, tttLosses: 0, tttDraws: 0,
    marketDeals: 0, marketWins: 0, marketLosses: 0,
    investments: 0, investmentWins: 0, investmentLosses: 0,
    speculations: 0, speculationWins: 0,
    ...(data.stats || {})
  },
  warns: data.warns || {},
  warnTox: data.warnTox ?? 0,
  lux: data.lux ?? 0,
  hunterXp: data.hunterXp ?? 0,
  hunterLevel: data.hunterLevel ?? 1,
  currentWeapon: data.currentWeapon || 'lanza_rustica',
  weaponLevel: data.weaponLevel ?? 1,
  weaponDurability: data.weaponDurability ?? 100,
  hunterStats: data.hunterStats || { successfulHunts: 0, failedHunts: 0 },
  capturedAnimals: data.capturedAnimals || {},
  minerXp: data.minerXp ?? 0,
  minerLevel: data.minerLevel ?? 1,
  currentPickaxe: data.currentPickaxe || 'pico_madera',
  pickaxeLevel: data.pickaxeLevel ?? 1,
  pickaxeDurability: data.pickaxeDurability ?? 100,
  miningStats: data.miningStats || { successfulMinings: 0, failedMinings: 0 },
  minedMinerals: data.minedMinerals || {},
  bankBalance: data.bankBalance ?? 0,
  bankProtectionUntil: data.bankProtectionUntil ?? null,
  inventory: data.inventory || {},
  dailyStats: data.dailyStats || {},
  fishermanXp: data.fishermanXp ?? 0,
  fishermanLevel: data.fishermanLevel ?? 1,
  currentRod: data.currentRod || 'cana_madera',
  currentReel: data.currentReel || 'carrete_oxidado',
  currentLine: data.currentLine || 'hilo_nylon',
  fishingStats: data.fishingStats || { successfulCatches: 0, failedCatches: 0 },
  capturedFishes: data.capturedFishes || {},
  market: {
    reputation: data.market?.reputation ?? 0,
    level: data.market?.level || 'Desconocido',
    specialization: data.market?.specialization ?? null,
    specializationLevel: data.market?.specializationLevel ?? 1,
    collection: data.market?.collection || {},
    totalValue: data.market?.totalValue ?? 0,
    deals: data.market?.deals ?? 0,
    successfulDeals: data.market?.successfulDeals ?? 0,
    failedDeals: data.market?.failedDeals ?? 0,
    bestFind: data.market?.bestFind ?? null,
    worstPurchase: data.market?.worstPurchase ?? null,
    lastDeal: data.market?.lastDeal ?? null
  },
  investments: {
    portfolio: data.investments?.portfolio || {},
    totalInvested: data.investments?.totalInvested ?? 0,
    currentValue: data.investments?.currentValue ?? 0,
    profitLoss: data.investments?.profitLoss ?? 0,
    bestInvestment: data.investments?.bestInvestment ?? null,
    worstInvestment: data.investments?.worstInvestment ?? null,
    insights: data.investments?.insights || {},
    longTerm: data.investments?.longTerm || [],
    speculations: data.investments?.speculations || [],
    dividends: data.investments?.dividends || { lastPayout: null, pending: 0, history: [] },
    lastMarketUpdate: data.investments?.lastMarketUpdate ?? null
  },
  carreraStats: {
    totalRuns: data.carreraStats?.totalRuns ?? 0,
    totalWins: data.carreraStats?.totalWins ?? 0,
    totalLosses: data.carreraStats?.totalLosses ?? 0,
    currentStreak: data.carreraStats?.currentStreak ?? 0,
    bestStreak: data.carreraStats?.bestStreak ?? 0,
    obstaclesSurvived: data.carreraStats?.obstaclesSurvived ?? 0,
    obstaclesFailed: data.carreraStats?.obstaclesFailed ?? 0,
    favoritePath: data.carreraStats?.favoritePath ?? null,
    path_izquierda: data.carreraStats?.path_izquierda ?? 0,
    path_centro: data.carreraStats?.path_centro ?? 0,
    path_derecha: data.carreraStats?.path_derecha ?? 0,
    path_correctos: data.carreraStats?.path_correctos ?? 0,
    path_incorrectos: data.carreraStats?.path_incorrectos ?? 0,
    totalEarned: data.carreraStats?.totalEarned ?? 0,
    totalLost: data.carreraStats?.totalLost ?? 0,
    lastRun: data.carreraStats?.lastRun ?? null
  },
  zenmatch: data.zenmatch || {
    active: false,
    name: null,
    age: null,
    gender: null,
    seeking: null,
    bio: '¡Hola! Estoy usando ZenMatch.',
    photo: null,
    nationality: null,
    hobbies: null,
    tags: [],
    verified: false,
    reportsCount: 0,
    filters: {},
    likesReceived: [],
    likesSent: [],
    passed: [],
    matches: [],
    chatRequests: []
  }
});

const USER_PERSISTED_FIELDS = [
  'id', 'userId', 'name', 'nickname', 'bio', 'status', 'location', 'age', 'gender',
  'registered', 'hadRegistered', 'xp', 'level', 'role', 'zencoins', 'kogen',
  'streak', 'maxStreak', 'lastActivity', 'streakPet', 'titles', 'activeTitle',
  'marriedWith', 'marriedSince', 'protectionUntil', 'proposal', 'cooldowns',
  'config', 'loans',
  'acWins', 'acLosses', 'acEarned', 'acRacha', 'acMaxRacha',
  'ahWins', 'ahLosses', 'ahEarned',
  'mathWins', 'mathLosses', 'mathEarned', 'mathFacil', 'mathMedio', 'mathDificil', 'mathImposible',
  'pptWins', 'pptLosses', 'pptDraws', 'pptEarned',
  'tvWins', 'tvLosses', 'tvEarned', 'tvLost', 'tvMaxRacha', 'tvCatStats',
  'stats', 'warns', 'warnTox', 'lux', 'hunterXp', 'hunterLevel', 'currentWeapon',
  'weaponLevel', 'weaponDurability', 'hunterStats', 'capturedAnimals', 'minerXp',
  'minerLevel', 'currentPickaxe', 'pickaxeLevel', 'pickaxeDurability',
  'miningStats', 'minedMinerals', 'bankBalance', 'bankProtectionUntil',
  'inventory', 'dailyStats', 'fishermanXp', 'fishermanLevel', 'currentRod',
  'currentReel', 'currentLine', 'fishingStats', 'capturedFishes',
  'market', 'investments', 'carreraStats', 'zenmatch'
];

const GROUP_DEFAULTS = (data = {}) => ({
  id: data.id,
  antilink: data.antilink ?? false,
  antilink_active: data.antilink_active || [],
  antinotadevoz: data.antinotadevoz ?? false,
  antimenciongp: data.antimenciongp ?? false,
  antisticker: data.antisticker ?? false,
  antivideo: data.antivideo ?? false,
  antiimagen: data.antiimagen ?? false,
  antidelete: data.antidelete ?? false,
  antitoxic: data.antitoxic ?? false,
  antispam: data.antispam ?? false,
  antispam_config: data.antispam_config || {
    maxMessages: 5,
    timeWindow: 5000,
    warnLimit: 3,
    muteDuration: 300000
  },
  welcome: data.welcome ?? false,
  welcomeMsg: data.welcomeMsg ?? null,
  welcomeImage: data.welcomeImage ?? null,
  goodbye: data.goodbye ?? false,
  goodbyeMsg: data.goodbyeMsg ?? null,
  goodbyeImage: data.goodbyeImage ?? null,
  onlyadmin: data.onlyadmin ?? false,
  nsfw: data.nsfw ?? false,
  warnLimit: data.warnLimit ?? 3,
  disabledCmds: data.disabledCmds || [],
  disabledCategories: data.disabledCategories || [],
  silencedUsers: data.silencedUsers || [],
  anticallgp: data.anticallgp ?? false,
  primaryBot: data.primaryBot ?? null
});

const GROUP_PERSISTED_FIELDS = [
  'id', 'antilink', 'antilink_active', 'antinotadevoz', 'antimenciongp', 'antisticker',
  'antivideo', 'antiimagen', 'antidelete', 'antitoxic', 'antispam', 'antispam_config',
  'welcome', 'welcomeMsg', 'welcomeImage', 'goodbye', 'goodbyeMsg', 'goodbyeImage',
  'onlyadmin', 'nsfw', 'warnLimit', 'disabledCmds', 'disabledCategories',
  'silencedUsers', 'anticallgp', 'primaryBot'
];

function createLocalModel({ tableName, defaultsFn, persistedFields }) {
  class LocalDoc {
    constructor(data = {}) {
      Object.assign(this, defaultsFn(data));
    }

    markModified() {}

    async save() {
      const db = getSQLite();
      const snapshot = {};
      for (const field of persistedFields) snapshot[field] = this[field];
      db.prepare(`INSERT OR REPLACE INTO ${tableName} (id, data) VALUES (?, ?)`).run(this.id, JSON.stringify(snapshot));
      return this;
    }
  }

  LocalDoc.find = (filter = {}) => new LocalQuery(async ({ sort, skip, limit }) => {
    const db = getSQLite();
    const rows = typeof filter.id === 'string'
      ? [db.prepare(`SELECT data FROM ${tableName} WHERE id = ?`).get(filter.id)].filter(Boolean)
      : db.prepare(`SELECT data FROM ${tableName}`).all();
    const docs = [];

    for (const row of rows) {
      try {
        const doc = new LocalDoc(JSON.parse(row.data));
        if (matchesFilter(doc, filter)) docs.push(doc);
      } catch {}
    }

    const sortFields = normalizeSort(sort);
    if (sortFields.length) {
      docs.sort((left, right) => {
        for (const [field, direction] of sortFields) {
          const a = getPath(left, field);
          const b = getPath(right, field);
          if (isDeepStrictEqual(a, b)) continue;
          if (a == null) return -1 * direction;
          if (b == null) return 1 * direction;
          if (a > b) return direction;
          if (a < b) return -direction;
        }
        return 0;
      });
    }

    const paged = skip ? docs.slice(skip) : docs;
    return limit == null ? paged : paged.slice(0, limit);
  });

  LocalDoc.findOne = async (filter = {}) => {
    const db = getSQLite();
    if (typeof filter.id === 'string') {
      const row = db.prepare(`SELECT data FROM ${tableName} WHERE id = ?`).get(filter.id);
      if (!row) return null;
      try {
        const parsed = JSON.parse(row.data);
        const doc = new LocalDoc(parsed);
        return matchesFilter(doc, filter) ? doc : null;
      } catch {
        return null;
      }
    }
    const results = await LocalDoc.find(filter);
    return results[0] || null;
  };

  LocalDoc.updateMany = async (filter = {}, update = {}) => {
    const db = getSQLite();
    const docs = await LocalDoc.find(filter);
    const stmt = db.prepare(`UPDATE ${tableName} SET data = ? WHERE id = ?`);
    const runTransaction = db.transaction((targets) => {
      let count = 0;
      for (const doc of targets) {
        applyUpdateOperators(doc, update);
        const snapshot = {};
        for (const field of persistedFields) snapshot[field] = doc[field];
        stmt.run(JSON.stringify(snapshot), doc.id);
        count++;
      }
      return count;
    });
    const modified = runTransaction(docs);
    return { matchedCount: modified, modifiedCount: modified };
  };

  LocalDoc.updateOne = async (filter = {}, update = {}, options = {}) => {
    const db = getSQLite();
    const doc = await LocalDoc.findOne(filter);
    if (doc) {
      applyUpdateOperators(doc, update);
      const snapshot = {};
      for (const field of persistedFields) snapshot[field] = doc[field];
      db.prepare(`UPDATE ${tableName} SET data = ? WHERE id = ?`).run(JSON.stringify(snapshot), doc.id);
      return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
    }

    if (options.upsert && typeof filter.id === 'string') {
      const newDoc = defaultsFn({ id: filter.id });
      applyUpdateOperators(newDoc, update);
      const snapshot = {};
      for (const field of persistedFields) snapshot[field] = newDoc[field];
      db.prepare(`INSERT OR REPLACE INTO ${tableName} (id, data) VALUES (?, ?)`).run(newDoc.id, JSON.stringify(snapshot));
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
    }

    return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
  };

  return LocalDoc;
}

const LocalUserDoc = createLocalModel({
  tableName: 'users',
  defaultsFn: USER_DEFAULTS,
  persistedFields: USER_PERSISTED_FIELDS
});
LocalUserDoc.prototype.addXP = addXP;
LocalUserDoc.prototype.updateRole = updateRole;

const LocalGroupDoc = createLocalModel({
  tableName: 'groups',
  defaultsFn: GROUP_DEFAULTS,
  persistedFields: GROUP_PERSISTED_FIELDS
});

export class UserModel {
  constructor(data = {}) {
    return mongoConnected ? new MongoUser(data) : new LocalUserDoc(data);
  }
  static find(filter = {}) {
    return mongoConnected ? MongoUser.find(filter) : LocalUserDoc.find(filter);
  }
  static findOne(filter = {}) {
    return mongoConnected ? MongoUser.findOne(filter) : LocalUserDoc.findOne(filter);
  }
  static updateMany(filter = {}, update = {}) {
    return mongoConnected ? MongoUser.updateMany(filter, update) : LocalUserDoc.updateMany(filter, update);
  }
  static updateOne(filter = {}, update = {}, options = {}) {
    return mongoConnected
      ? MongoUser.updateOne(filter, update, { setDefaultsOnInsert: true, ...options })
      : LocalUserDoc.updateOne(filter, update, options);
  }
}

export class GroupModel {
  constructor(data = {}) {
    return mongoConnected ? new MongoGroup(data) : new LocalGroupDoc(data);
  }
  static find(filter = {}) {
    return mongoConnected ? MongoGroup.find(filter) : LocalGroupDoc.find(filter);
  }
  static findOne(filter = {}) {
    return mongoConnected ? MongoGroup.findOne(filter) : LocalGroupDoc.findOne(filter);
  }
  static updateMany(filter = {}, update = {}) {
    return mongoConnected ? MongoGroup.updateMany(filter, update) : LocalGroupDoc.updateMany(filter, update);
  }
  static updateOne(filter = {}, update = {}, options = {}) {
    return mongoConnected
      ? MongoGroup.updateOne(filter, update, { setDefaultsOnInsert: true, ...options })
      : LocalGroupDoc.updateOne(filter, update, options);
  }
}