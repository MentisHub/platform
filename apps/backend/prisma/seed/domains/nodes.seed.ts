import { faker } from '@faker-js/faker';
import { Node, NodeStatus, PrismaClient } from '@prisma/client';
import { generatePSKWithHash } from '../../../src/utils/index.js';
import { uuidToBase32 } from '../../../src/utils/uuid.util.js';

export interface ProjectNodeResult {
  createdNodes: Node[];
  readyNodes: Node[];
  initializingNodes: Node[];
  offlineNodes: Node[];
  errorNodes: Node[];
  createdNodePsks: Record<string, string>;
}

function nodeMetadata() {
  return {
    cpu: faker.number.int({ min: 2, max: 32 }),
    memory: `${faker.number.int({ min: 4, max: 128 })}GB`,
    gpu: faker.helpers.arrayElement([
      null,
      'NVIDIA RTX 3090',
      'NVIDIA RTX 4090',
      'NVIDIA A100',
      'NVIDIA V100',
      'AMD MI250',
    ]),
    region: faker.location.country(),
    os: faker.helpers.arrayElement([
      'Ubuntu 22.04',
      'Ubuntu 20.04',
      'Debian 11',
      'CentOS 8',
    ]),
  };
}

export async function createNodesForProject(
  prisma: PrismaClient,
  projectId: string,
  organizationId: string,
  createdBy: string,
): Promise<ProjectNodeResult> {
  const createdNodes: Node[] = [];
  const readyNodes: Node[] = [];
  const initializingNodes: Node[] = [];
  const offlineNodes: Node[] = [];
  const errorNodes: Node[] = [];
  const createdNodePsks: Record<string, string> = {};

  // CREATED
  const createdCount = faker.number.int({ min: 3, max: 6 });
  for (let i = 0; i < createdCount; i++) {
    const { psk, hash } = generatePSKWithHash();
    const node = await prisma.node.create({
      data: {
        name: `node-${faker.string.alphanumeric(8)}`,
        status: NodeStatus.CREATED,
        pskHash: hash,
        metadata: nodeMetadata(),
        organizationId,
        projectId,
        createdById: createdBy,
      },
    });
    const fullPsk = `${uuidToBase32(node.id)}.${psk}`;
    createdNodePsks[node.id] = fullPsk;
    createdNodes.push(node);
  }

  // INITIALIZING
  {
    const { hash } = generatePSKWithHash();
    const activatedAt = faker.date.recent({ days: 1 });
    const node = await prisma.node.create({
      data: {
        name: `node-${faker.string.alphanumeric(8)}`,
        status: NodeStatus.INITIALIZING,
        pskHash: hash,
        flowerNodeId: faker.string.uuid(),
        ecPublicKey: Buffer.from(faker.string.alphanumeric(64)).toString(
          'base64',
        ),
        metadata: nodeMetadata(),
        organizationId,
        projectId,
        createdById: createdBy,
        activatedAt,
        lastActiveAt: activatedAt,
      },
    });
    initializingNodes.push(node);
    console.log(`    [NODE:INIT]      ${node.name}  →  ${node.id}`);
  }

  // READY
  const readyCount = faker.number.int({ min: 2, max: 4 });
  for (let i = 0; i < readyCount; i++) {
    const { hash } = generatePSKWithHash();
    const activatedAt = faker.date.recent({ days: 14 });
    const node = await prisma.node.create({
      data: {
        name: `node-${faker.string.alphanumeric(8)}`,
        status: NodeStatus.READY,
        pskHash: hash,
        flowerNodeId: faker.string.uuid(),
        ecPublicKey: Buffer.from(faker.string.alphanumeric(64)).toString(
          'base64',
        ),
        metadata: nodeMetadata(),
        organizationId,
        projectId,
        createdById: createdBy,
        activatedAt,
        lastActiveAt: faker.date.between({ from: activatedAt, to: new Date() }),
      },
    });
    readyNodes.push(node);
    console.log(`    [NODE:READY]     ${node.name}  →  ${node.id}`);
  }

  // OFFLINE
  {
    const { hash } = generatePSKWithHash();
    const activatedAt = faker.date.recent({ days: 7 });
    const node = await prisma.node.create({
      data: {
        name: `node-${faker.string.alphanumeric(8)}`,
        status: NodeStatus.OFFLINE,
        pskHash: hash,
        flowerNodeId: faker.string.uuid(),
        ecPublicKey: Buffer.from(faker.string.alphanumeric(64)).toString(
          'base64',
        ),
        metadata: nodeMetadata(),
        organizationId,
        projectId,
        createdById: createdBy,
        activatedAt,
        lastActiveAt: faker.date.recent({ days: 2 }),
      },
    });
    offlineNodes.push(node);
    console.log(`    [NODE:OFFLINE]   ${node.name}  →  ${node.id}`);
  }

  // ERROR
  {
    const { hash } = generatePSKWithHash();
    const node = await prisma.node.create({
      data: {
        name: `node-${faker.string.alphanumeric(8)}`,
        status: NodeStatus.ERROR,
        pskHash: hash,
        metadata: nodeMetadata(),
        organizationId,
        projectId: null,
        createdById: createdBy,
      },
    });
    errorNodes.push(node);
    console.log(`    [NODE:ERROR]     ${node.name}  →  ${node.id}`);
  }

  return {
    createdNodes,
    readyNodes,
    initializingNodes,
    offlineNodes,
    errorNodes,
    createdNodePsks,
  };
}
