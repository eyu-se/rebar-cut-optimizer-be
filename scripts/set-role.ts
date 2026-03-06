import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];
    const newRole = process.argv[3] || 'ADMIN';

    if (!email) {
        console.error('Please provide an email address as the first argument.');
        console.error('Usage: npm run set-role <email> [role]');
        process.exit(1);
    }

    try {
        const user = await prisma.user.update({
            where: { email },
            data: { role: newRole },
        });
        console.log(`Successfully updated user ${email} to role: ${user.role}`);
    } catch (error: any) {
        if (error.code === 'P2025') {
            console.error(`User with email ${email} not found.`);
        } else {
            console.error('An error occurred:', error);
        }
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
