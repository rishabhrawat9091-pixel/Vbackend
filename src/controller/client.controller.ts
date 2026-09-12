import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(2, "Client name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  company: z.string().optional(),
});

export const getClients = async (_req: Request, res: Response): Promise<void> => {
  try {
    const clients = await prisma.client.findMany({
      include: {
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { name: "asc" },
    });

    res.status(200).json({
      success: true,
      clients,
    });
  } catch (error) {
    console.error("Get Clients Error:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to fetch clients" },
    });
  }
};

export const createClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, company } = req.body;

    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        email: email ? email.trim() : null,
        company: company ? company.trim() : null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Client created successfully",
      client,
    });
  } catch (error) {
    console.error("Create Client Error:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to create client" },
    });
  }
};

export const updateClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, email, company } = req.body;

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Client not found" },
      });
      return;
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        email: email !== undefined ? (email ? email.trim() : null) : existing.email,
        company: company !== undefined ? (company ? company.trim() : null) : existing.company,
      },
    });

    res.status(200).json({
      success: true,
      message: "Client updated successfully",
      client: updated,
    });
  } catch (error) {
    console.error("Update Client Error:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to update client" },
    });
  }
};

export const deleteClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Client not found" },
      });
      return;
    }

    await prisma.client.delete({ where: { id } });
    res.status(200).json({
      success: true,
      message: "Client deleted successfully",
    });
  } catch (error) {
    console.error("Delete Client Error:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to delete client" },
    });
  }
};
