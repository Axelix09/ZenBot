import { PermissionLevel } from './permissions.js';

export class ZenCommand {
  constructor(name) {
    this.name = name.toLowerCase();
    this.aliases = [];
    this.cooldownSeconds = 3;
    this.categoryName = 'General';
    this.permissionLevel = PermissionLevel.USER;
    this.groupOnly = false;
    this.privateOnly = false;
    this.adminOnly = false;
    this.needsBotAdmin = false;
    this.isNsfw = false;
    this.needsRegistration = false;
    this.requiredTitle = null;
    this.usage = '';
    this.hidden = false;
    this.handler = async () => {};
  }

  addAlias(...aliases) {
    this.aliases.push(...aliases.map(a => a.toLowerCase()));
    return this;
  }

  setCooldown(seconds) {
    this.cooldownSeconds = seconds;
    return this;
  }

  setCategory(category) {
    this.categoryName = category;
    return this;
  }

  requirePermission(level) {
    this.permissionLevel = level;
    return this;
  }

  requireOwner() {
    this.permissionLevel = PermissionLevel.OWNER;
    return this;
  }

  requireGroup() {
    this.groupOnly = true;
    return this;
  }

  requirePrivate() {
    this.privateOnly = true;
    return this;
  }

  requireAdmin() {
    this.adminOnly = true;
    return this;
  }

  requireBotAdmin() {
    this.needsBotAdmin = true;
    return this;
  }

  setNSFW() {
    this.isNsfw = true;
    return this;
  }

  requireRegistration() {
    this.needsRegistration = true;
    return this;
  }

  requireTitle(titleId) {
    this.requiredTitle = titleId;
    return this;
  }

  setUsage(usage) {
    this.usage = usage;
    return this;
  }

  setHidden(isHidden = true) {
    this.hidden = isHidden;
    return this;
  }

  onExecute(callback) {
    this.handler = callback;
    return this;
  }
}