import { Pool } from "pg";
import { env } from "../env/env.js";

export const postgres = new Pool({ ...env.postgres, max: 5 });
