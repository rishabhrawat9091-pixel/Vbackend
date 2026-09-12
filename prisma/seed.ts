import { PrismaClient, Role, TaskStatus, TaskPriority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database according to Velozity Assessment requirements...");

  // 1. Clean existing records in relational order
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const salt = 10;
  const adminPass = await bcrypt.hash("Admin@123", salt);
  const userPass = await bcrypt.hash("Password@123", salt);

  // 2. Create Users: Exactly 1 Admin, 2 Project Managers, 4 Developers
  const admin = await prisma.user.create({
    data: {
      name: "Alex Administrator",
      email: "admin@agency.com",
      password: adminPass,
      role: Role.ADMIN,
    },
  });

  const pm1 = await prisma.user.create({
    data: {
      name: "Priya Sharma",
      email: "pm1@agency.com",
      password: userPass,
      role: Role.PROJECT_MANAGER,
    },
  });

  const pm2 = await prisma.user.create({
    data: {
      name: "Rahul Verma",
      email: "pm2@agency.com",
      password: userPass,
      role: Role.PROJECT_MANAGER,
    },
  });

  const dev1 = await prisma.user.create({
    data: {
      name: "Ravi Kumar",
      email: "dev1@agency.com",
      password: userPass,
      role: Role.DEVELOPER,
    },
  });

  const dev2 = await prisma.user.create({
    data: {
      name: "Sneha Patel",
      email: "dev2@agency.com",
      password: userPass,
      role: Role.DEVELOPER,
    },
  });

  const dev3 = await prisma.user.create({
    data: {
      name: "Aditya Singh",
      email: "dev3@agency.com",
      password: userPass,
      role: Role.DEVELOPER,
    },
  });

  const dev4 = await prisma.user.create({
    data: {
      name: "Vikram Joshi",
      email: "dev4@agency.com",
      password: userPass,
      role: Role.DEVELOPER,
    },
  });

  console.log("✅ Seeded 1 Admin, 2 Project Managers, 4 Developers");

  // 3. Create Clients
  const client1 = await prisma.client.create({
    data: {
      name: "TechVision Corp",
      email: "contact@techvision.com",
      company: "TechVision Corporation",
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: "GreenLeaf Solutions",
      email: "hello@greenleaf.io",
      company: "GreenLeaf Solutions Inc.",
    },
  });

  const client3 = await prisma.client.create({
    data: {
      name: "NovaStar Digital",
      email: "info@novastar.digital",
      company: "NovaStar Digital Media Ltd.",
    },
  });

  const now = new Date();
  const d = (n: number) => new Date(now.getTime() + n * 86400000);

  // 4. Create 3 Projects (PM1 owns P1 & P2, PM2 owns P3)
  const p1 = await prisma.project.create({
    data: {
      name: "TechVision E-Commerce Platform",
      description: "Full-stack enterprise e-commerce platform with real-time inventory and analytics.",
      clientId: client1.id,
      projectManagerId: pm1.id,
    },
  });

  const p2 = await prisma.project.create({
    data: {
      name: "GreenLeaf Sustainability Dashboard",
      description: "Environmental sensor metrics tracking and ESG compliance dashboard.",
      clientId: client2.id,
      projectManagerId: pm1.id,
    },
  });

  const p3 = await prisma.project.create({
    data: {
      name: "NovaStar Content Management System",
      description: "Headless CMS engine with multi-tenant publishing and media pipeline.",
      clientId: client3.id,
      projectManagerId: pm2.id,
    },
  });

  console.log("✅ Seeded 3 Client Projects");

  // 5. Create Tasks: At least 5 tasks per project across all statuses & priorities
  // Project 1 Tasks (6 tasks)
  const t1 = await prisma.task.create({
    data: {
      title: "Design Relational Database Schema",
      description: "PostgreSQL schema for products, categories, orders, and inventory tracking.",
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: d(-10),
      isOverdue: false,
      projectId: p1.id,
      assignedToId: dev1.id,
    },
  });

  const t2 = await prisma.task.create({
    data: {
      title: "Build Product Catalog REST API",
      description: "Implement CRUD endpoints with pagination, full-text search, and filtering.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: d(3),
      isOverdue: false,
      projectId: p1.id,
      assignedToId: dev1.id,
    },
  });

  const t3 = await prisma.task.create({
    data: {
      title: "Stripe Payment Gateway Integration",
      description: "Secure checkout session creation, webhook signatures, and refund flows.",
      status: TaskStatus.TODO,
      priority: TaskPriority.CRITICAL,
      dueDate: d(7),
      isOverdue: false,
      projectId: p1.id,
      assignedToId: dev2.id,
    },
  });

  const t4 = await prisma.task.create({
    data: {
      title: "Shopping Cart & Checkout UI",
      description: "Responsive shopping cart drawer with optimistic state updates and coupon inputs.",
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH,
      dueDate: d(5),
      isOverdue: false,
      projectId: p1.id,
      assignedToId: dev2.id,
    },
  });

  const t5 = await prisma.task.create({
    data: {
      title: "JWT Authentication & Session Management",
      description: "Dual token architecture with HttpOnly refresh cookies and token rotation.",
      status: TaskStatus.DONE,
      priority: TaskPriority.CRITICAL,
      dueDate: d(-5),
      isOverdue: false,
      projectId: p1.id,
      assignedToId: dev3.id,
    },
  });

  const t6 = await prisma.task.create({
    data: {
      title: "Sales Analytics Aggregation Pipeline",
      description: "Batch query job calculating weekly GMV, churn rate, and repeat customer ratios.",
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: d(-2),
      isOverdue: true, // OVERDUE TASK 1
      projectId: p1.id,
      assignedToId: dev4.id,
    },
  });

  // Project 2 Tasks (5 tasks)
  const t7 = await prisma.task.create({
    data: {
      title: "IoT Sensor Ingestion API",
      description: "High-throughput endpoint accepting real-time carbon telemetry streams.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      dueDate: d(4),
      isOverdue: false,
      projectId: p2.id,
      assignedToId: dev1.id,
    },
  });

  const t8 = await prisma.task.create({
    data: {
      title: "Carbon Emission Calculator Engine",
      description: "Formula calculations translating raw kilowatt usage to standard CO2 metric tons.",
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      dueDate: d(10),
      isOverdue: false,
      projectId: p2.id,
      assignedToId: dev2.id,
    },
  });

  const t9 = await prisma.task.create({
    data: {
      title: "Facility Emission Audit Report Generator",
      description: "Scheduled PDF summary generation for compliance submission deadlines.",
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      dueDate: d(-3),
      isOverdue: true, // OVERDUE TASK 2
      projectId: p2.id,
      assignedToId: dev3.id,
    },
  });

  const t10 = await prisma.task.create({
    data: {
      title: "Real-Time Telemetry Socket Feed",
      description: "WebSocket pipeline pushing live temperature and energy draws to dashboard.",
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.MEDIUM,
      dueDate: d(2),
      isOverdue: false,
      projectId: p2.id,
      assignedToId: dev4.id,
    },
  });

  const t11 = await prisma.task.create({
    data: {
      title: "Historical Emission Comparison Charts",
      description: "Interactive SVG timeline showing month-over-month reduction metrics.",
      status: TaskStatus.DONE,
      priority: TaskPriority.LOW,
      dueDate: d(-8),
      isOverdue: false,
      projectId: p2.id,
      assignedToId: dev4.id,
    },
  });

  // Project 3 Tasks (5 tasks)
  const t12 = await prisma.task.create({
    data: {
      title: "Multi-Tenant Schema Isolation",
      description: "Database partitioning and tenant scoping for multi-brand deployment.",
      status: TaskStatus.DONE,
      priority: TaskPriority.CRITICAL,
      dueDate: d(-15),
      isOverdue: false,
      projectId: p3.id,
      assignedToId: dev1.id,
    },
  });

  const t13 = await prisma.task.create({
    data: {
      title: "TipTap Rich Text Editor Extensions",
      description: "Custom markdown shortcuts, table embeds, and code highlighting blocks.",
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.MEDIUM,
      dueDate: d(2),
      isOverdue: false,
      projectId: p3.id,
      assignedToId: dev2.id,
    },
  });

  const t14 = await prisma.task.create({
    data: {
      title: "S3 Asset Upload & CloudFront CDN Pipeline",
      description: "Presigned URL generation and automated WebP thumbnail compression.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: d(6),
      isOverdue: false,
      projectId: p3.id,
      assignedToId: dev3.id,
    },
  });

  const t15 = await prisma.task.create({
    data: {
      title: "Role-Based Content Publishing Workflow",
      description: "Editorial approval matrix requiring Editor signoff before publish.",
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      dueDate: d(-1),
      isOverdue: true, // OVERDUE TASK 3
      projectId: p3.id,
      assignedToId: dev4.id,
    },
  });

  const t16 = await prisma.task.create({
    data: {
      title: "SEO Metadata & OpenGraph Tag Generator",
      description: "Dynamic meta tag injection and structured schema.org markup generation.",
      status: TaskStatus.DONE,
      priority: TaskPriority.LOW,
      dueDate: d(-12),
      isOverdue: false,
      projectId: p3.id,
      assignedToId: dev3.id,
    },
  });

  console.log("✅ Seeded 16 Tasks across 3 Projects (each with 5+ tasks, 3 Overdue)");

  // 6. Create realistic Activity Logs (Formatted as: "{User} moved {Task} from {A} → {B}")
  const logs = [
    {
      userId: pm1.id,
      projectId: p1.id,
      taskId: t1.id,
      action: "TASK_CREATED",
      details: "Priya Sharma created Design Relational Database Schema and assigned to Ravi Kumar",
      fromStatus: null,
      toStatus: TaskStatus.TODO,
      createdAt: d(-12),
    },
    {
      userId: dev1.id,
      projectId: p1.id,
      taskId: t1.id,
      action: "STATUS_CHANGE",
      details: "Ravi Kumar moved Design Relational Database Schema from In Progress → Done",
      fromStatus: TaskStatus.IN_PROGRESS,
      toStatus: TaskStatus.DONE,
      createdAt: d(-10),
    },
    {
      userId: pm1.id,
      projectId: p1.id,
      taskId: t2.id,
      action: "TASK_CREATED",
      details: "Priya Sharma created Build Product Catalog REST API and assigned to Ravi Kumar",
      fromStatus: null,
      toStatus: TaskStatus.TODO,
      createdAt: d(-8),
    },
    {
      userId: dev1.id,
      projectId: p1.id,
      taskId: t2.id,
      action: "STATUS_CHANGE",
      details: "Ravi Kumar moved Build Product Catalog REST API from To Do → In Progress",
      fromStatus: TaskStatus.TODO,
      toStatus: TaskStatus.IN_PROGRESS,
      createdAt: d(-5),
    },
    {
      userId: dev2.id,
      projectId: p1.id,
      taskId: t4.id,
      action: "STATUS_CHANGE",
      details: "Sneha Patel moved Shopping Cart & Checkout UI from In Progress → In Review",
      fromStatus: TaskStatus.IN_PROGRESS,
      toStatus: TaskStatus.IN_REVIEW,
      createdAt: d(-1),
    },
    {
      userId: pm1.id,
      projectId: p2.id,
      taskId: t7.id,
      action: "TASK_CREATED",
      details: "Priya Sharma created IoT Sensor Ingestion API and assigned to Ravi Kumar",
      fromStatus: null,
      toStatus: TaskStatus.TODO,
      createdAt: d(-6),
    },
    {
      userId: dev1.id,
      projectId: p2.id,
      taskId: t7.id,
      action: "STATUS_CHANGE",
      details: "Ravi Kumar moved IoT Sensor Ingestion API from To Do → In Progress",
      fromStatus: TaskStatus.TODO,
      toStatus: TaskStatus.IN_PROGRESS,
      createdAt: d(-3),
    },
    {
      userId: dev4.id,
      projectId: p2.id,
      taskId: t10.id,
      action: "STATUS_CHANGE",
      details: "Vikram Joshi moved Real-Time Telemetry Socket Feed from In Progress → In Review",
      fromStatus: TaskStatus.IN_PROGRESS,
      toStatus: TaskStatus.IN_REVIEW,
      createdAt: d(-1),
    },
    {
      userId: pm2.id,
      projectId: p3.id,
      taskId: t12.id,
      action: "TASK_CREATED",
      details: "Rahul Verma created Multi-Tenant Schema Isolation and assigned to Ravi Kumar",
      fromStatus: null,
      toStatus: TaskStatus.TODO,
      createdAt: d(-20),
    },
    {
      userId: dev1.id,
      projectId: p3.id,
      taskId: t12.id,
      action: "STATUS_CHANGE",
      details: "Ravi Kumar moved Multi-Tenant Schema Isolation from In Progress → Done",
      fromStatus: TaskStatus.IN_PROGRESS,
      toStatus: TaskStatus.DONE,
      createdAt: d(-15),
    },
    {
      userId: dev2.id,
      projectId: p3.id,
      taskId: t13.id,
      action: "STATUS_CHANGE",
      details: "Sneha Patel moved TipTap Rich Text Editor Extensions from In Progress → In Review",
      fromStatus: TaskStatus.IN_PROGRESS,
      toStatus: TaskStatus.IN_REVIEW,
      createdAt: d(-1),
    },
    {
      userId: dev4.id,
      projectId: p3.id,
      taskId: t15.id,
      action: "TASK_CREATED",
      details: "Rahul Verma created Role-Based Content Publishing Workflow and assigned to Vikram Joshi",
      fromStatus: null,
      toStatus: TaskStatus.TODO,
      createdAt: d(-4),
    },
  ];

  for (const log of logs) {
    await prisma.activityLog.create({ data: log });
  }

  console.log(`✅ Seeded ${logs.length} Activity Log entries for instant feed display`);

  // 7. Create In-App Notifications (stored in DB)
  await prisma.notification.createMany({
    data: [
      {
        userId: dev1.id,
        title: "New Task Assigned",
        message: "You were assigned to 'Build Product Catalog REST API' in TechVision E-Commerce Platform",
        type: "TASK_ASSIGNED",
        taskId: t2.id,
        projectId: p1.id,
        isRead: false,
      },
      {
        userId: pm1.id,
        title: "Task Moved to In Review",
        message: "Sneha Patel moved 'Shopping Cart & Checkout UI' to In Review",
        type: "TASK_IN_REVIEW",
        taskId: t4.id,
        projectId: p1.id,
        isRead: false,
      },
      {
        userId: pm1.id,
        title: "Task Moved to In Review",
        message: "Vikram Joshi moved 'Real-Time Telemetry Socket Feed' to In Review",
        type: "TASK_IN_REVIEW",
        taskId: t10.id,
        projectId: p2.id,
        isRead: false,
      },
      {
        userId: pm2.id,
        title: "Task Moved to In Review",
        message: "Sneha Patel moved 'TipTap Rich Text Editor Extensions' to In Review",
        type: "TASK_IN_REVIEW",
        taskId: t13.id,
        projectId: p3.id,
        isRead: false,
      },
      {
        userId: dev4.id,
        title: "New Task Assigned",
        message: "You were assigned to 'Role-Based Content Publishing Workflow' in NovaStar CMS",
        type: "TASK_ASSIGNED",
        taskId: t15.id,
        projectId: p3.id,
        isRead: false,
      },
    ],
  });

  console.log("✅ Seeded initial DB notifications");
  console.log("\n=======================================================");
  console.log("🚀 DATABASE SEED COMPLETE - ALL VELOZITY CRITERIA MET");
  console.log("=======================================================");
  console.log("Admin:            admin@agency.com / Admin@123");
  console.log("Project Manager:  pm1@agency.com   / Password@123");
  console.log("Project Manager:  pm2@agency.com   / Password@123");
  console.log("Developer 1:      dev1@agency.com  / Password@123");
  console.log("Developer 2:      dev2@agency.com  / Password@123");
  console.log("Developer 3:      dev3@agency.com  / Password@123");
  console.log("Developer 4:      dev4@agency.com  / Password@123");
  console.log("=======================================================\n");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
