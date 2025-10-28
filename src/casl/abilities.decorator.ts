// src/casl/abilities.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Action, Subjects } from './casl-ability.factory';

export interface RequiredRule {
  action: Action;
  subject: Subjects;
}

export const CHECK_ABILITIES_KEY = 'check_ability';
export const CheckAbilities = (...requirements: RequiredRule[]) =>
  SetMetadata(CHECK_ABILITIES_KEY, requirements);
