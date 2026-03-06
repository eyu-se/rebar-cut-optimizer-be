import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });
        res.json(users);
    } catch (error) {
        next(error);
    }
};

export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        const user = await prisma.user.update({
            where: { id: id as string },
            data: { role },
            select: { id: true, email: true, role: true },
        });

        res.json(user);
    } catch (error) {
        next(error);
    }
};

export const getAccessLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const logs = await prisma.accessLog.findMany({
            include: {
                user: {
                    select: { email: true, role: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 100, // Limit to recent 100 for now
        });
        res.json(logs);
    } catch (error) {
        next(error);
    }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true, createdAt: true },
        });
        res.json(user);
    } catch (error) {
        next(error);
    }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userIdToUpdate = req.params.id as string;
        const { email, password, role } = req.body;

        const updateData: any = {};
        if (email) updateData.email = email;
        if (role) updateData.role = role;
        if (password) {
            updateData.passwordHash = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id: userIdToUpdate },
            data: updateData,
            select: { id: true, email: true, role: true, createdAt: true },
        });

        res.json(user);
    } catch (error) {
        next(error);
    }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userIdToDelete = req.params.id as string;

        if (userIdToDelete === (req as any).user.userId) {
            return res.status(400).json({ error: "Cannot delete your own account." });
        }

        await prisma.user.delete({
            where: { id: userIdToDelete },
        });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
};
