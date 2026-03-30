import { Prisma } from "@prisma/client";

import { prisma } from "../../prisma.js";

export type TxClient = Prisma.TransactionClient | typeof prisma;
