import { PrismaClient, Prisma } from "@prisma/client";

const prismaclient = new PrismaClient();

export { Prisma };
export { prismaclient };
export default prismaclient;
