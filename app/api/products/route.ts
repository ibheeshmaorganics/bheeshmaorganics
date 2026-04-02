import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';

const JWT_SECRET = process.env.JWT_SECRET || 'bheeshma_super_secret_key_2026';

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const formatted = products.map((p) => ({ ...p, _id: p.id }));
    return NextResponse.json({ products: formatted });
  } catch {
    return NextResponse.json({ error: 'DB Connection Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    jwt.verify(token, JWT_SECRET);
    const body = await req.json();

    // Handle Cloudinary Base64 Image Upload
    if (body.images && Array.isArray(body.images)) {
      const uploadedImages = [];
      for (const img of body.images) {
        if (img.startsWith('data:image')) {
          const uploadResponse = await cloudinary.uploader.upload(img, { folder: 'bheeshma_products' });
          uploadedImages.push(uploadResponse.secure_url);
        } else {
          uploadedImages.push(img);
        }
      }
      body.images = uploadedImages;
    }

    if (body.price) body.price = Number(body.price);
    if (body.discount) body.discount = Number(body.discount);
    if (body.quantity) body.quantity = Number(body.quantity);

    const product = await prisma.product.create({ data: body });
    return NextResponse.json({ product: { ...product, _id: product.id } }, { status: 201 });
  } catch (err) {
    console.error('Product POST err:', err);
    return NextResponse.json({ error: 'Validation failed or Unauthorized' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    jwt.verify(token, JWT_SECRET);
    const { id, _id, ...updateData } = await req.json();
    const targetId = id || _id;
    if (!targetId) return NextResponse.json({ error: 'Missing product ID' }, { status: 400 });

    if (updateData.images && Array.isArray(updateData.images)) {
      const uploadedImages = [];
      for (const img of updateData.images) {
        if (img.startsWith('data:image')) {
          const uploadResponse = await cloudinary.uploader.upload(img, { folder: 'bheeshma_products' });
          uploadedImages.push(uploadResponse.secure_url);
        } else {
          uploadedImages.push(img);
        }
      }
      updateData.images = uploadedImages;
    }

    if (updateData.price) updateData.price = Number(updateData.price);
    if (updateData.discount) updateData.discount = Number(updateData.discount);
    if (updateData.quantity) updateData.quantity = Number(updateData.quantity);

    const updated = await prisma.product.update({ where: { id: targetId }, data: updateData });
    return NextResponse.json({ product: { ...updated, _id: updated.id } });
  } catch (err) {
    console.error('Product PUT err:', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    jwt.verify(token, JWT_SECRET);
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing product ID' }, { status: 400 });

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Deletion failed' }, { status: 400 });
  }
}
