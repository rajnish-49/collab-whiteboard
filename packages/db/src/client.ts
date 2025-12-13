// @ts-ignore - Prisma client is CommonJS
import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const prismaclient = new PrismaClient();

export { prismaclient };
export default prismaclient;
