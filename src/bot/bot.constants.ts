export const ROLES_KEY = 'roles';
export const BOT_NAME = 'License Version Controller';
export enum UserRoles {
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  USER = 'User',
}

// =======================Commands & Buttons======================

export const MAIN_ADMIN_BUTTONS = [['Licenses'], ['Add User']];

// =======================Admin Actions======================
export const ADMIN_ACTIONS = {
  ADDING_USER: 'addinguser',
  GIVING_ROLE: 'givingrole',
};
