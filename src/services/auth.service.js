const bcrypt = require('bcryptjs');
const prisma = require('../prisma/client');
const { generateToken } = require('../utils/jwt');

const SALT_ROUNDS = 10;

async function register({ email, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('El email ya está registrado');
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      username: email,
      passwordHash: hashedPassword,
    },
  });

  const token = generateToken({ userId: user.id.toString() });

  return { user: { id: user.id.toString(), email: user.email }, token };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ 
    where: { email },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });
  
  if (!user) {
    throw new Error('Credenciales inválidas');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Credenciales inválidas');
  }

  const roles = user.userRoles.map(ur => ur.role.name.trim());
  const permissions = user.userRoles.flatMap(ur => 
    ur.role.rolePermissions.map(rp => rp.permission.code)
  );

  // Eliminar duplicados
  const uniquePermissions = [...new Set(permissions)];

  const token = generateToken({ 
    userId: user.id.toString(),
    roles,
    permissions: uniquePermissions,
  });

  return { 
    user: { 
      id: user.id.toString(), 
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      roles,
      permissions: uniquePermissions,
    }, 
    token 
  };
}

module.exports = {
  register,
  login,
};
