import * as R from 'ramda';
// import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs';

// import * as Handlebars from 'handlebars';

import { BaseFiltersDto } from '../dto/base-filters.dto';
// import { EHandlebarsTemplates } from '../enums/enums';

export const isEmptyOrNil = (value: unknown): boolean => R.either(R.isNil, R.isEmpty)(value as any);

// Helper function to include field if it exists
export const includeIfPresent = ( field: string, opts?: { toBoolean?: boolean; cast?: (value: any) => any; },
) =>
  R.ifElse(
    R.has(field),
    R.pipe(
      R.prop(field),
      (value) => (opts?.toBoolean ? value === 'true' : value),
      (value) => (opts?.cast ? opts.cast(value) : value),
    ),
    R.always(undefined),
  );

// Define a generic type for the input object
type CleanedObject<T> = Partial<Record<keyof T, Exclude<T[keyof T], undefined>>>;

// A cleaner function that removes `undefined` values from an object
export const cleanObject = <T extends Record<string, any>>(obj: T): CleanedObject<T> =>
  R.pickBy(
    R.compose(
      (value: any) => {
        if (value === undefined) return false;
        if (typeof value === 'object' && value !== null) {
          return !R.isEmpty(value);
        }
        return true;
      },
      R.identity
    )
  )(obj);

export const getQueryMetadata = (query: BaseFiltersDto = {}, totalDocs: number) => {
  const { page = '1', limit = '10' } = query;
  const meta = {
    currentPage: +page,
    itemsPerPage: +limit,
    total: totalDocs,
    totalPages: Math.ceil((totalDocs ?? 0) / +limit),
  };

  return meta;
};

// export const hashPassword = async (plainPassword: string, hashSalt = 12): Promise<string> => {
//   const salt = await bcrypt.genSalt(hashSalt);
//   const hashedPassword = await bcrypt.hash(plainPassword, salt);

//   return hashedPassword;
// };

// export const compileTemplate = (templateName: EHandlebarsTemplates, payload: Record<string, any>): string => {
//   const templatePath = path.join(process.cwd(), 'templates', `${templateName}.hbs`);

//   const templateSource = fs.readFileSync(templatePath, 'utf8');
//   const template = Handlebars.compile(templateSource);

//   return template(payload);
// };
