import express from 'express';
import request from 'supertest';
import { registerRoutes } from '../server/routes';

jest.mock('../server/storage', () => {
  const storage = {
    upsertUser: jest.fn(),
    getUser: jest.fn(),
    updateUser: jest.fn(),
    getPantryItems: jest.fn(),
    addPantryItem: jest.fn(),
    removePantryItem: jest.fn(),
    migratePantryItems: jest.fn(),
    getDonations: jest.fn(),
    addDonation: jest.fn(),
    getNotifications: jest.fn(),
    markNotificationRead: jest.fn(),
    clearAllNotifications: jest.fn(),
  };

  return { storage };
});

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: { text: () => '{"name":"Apple","category":"Fruits","shelfLifeDays":5,"confidence":98,"storageLocation":"Fridge","unit":"pcs"}' },
      }),
    }),
  })),
}));

import { storage } from '../server/storage';

const mockedStorage = storage as jest.Mocked<typeof storage>;

describe('Express route handlers', () => {
  let app: express.Express;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    await registerRoutes(app);
  });

  it('syncs a user account', async () => {
    mockedStorage.upsertUser.mockResolvedValueOnce({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'Donor',
      avatar: null,
      foodSaved: 0,
      donationsMade: 0,
      co2Reduced: 0,
      mealsProvided: 0,
    } as any);

    const response = await request(app)
      .post('/api/auth/sync')
      .send({ id: 'user-1', email: 'test@example.com', name: 'Test User' });

    expect(response.status).toBe(200);
    expect(mockedStorage.upsertUser).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1', email: 'test@example.com' }));
  });

  it('returns pantry items for a user', async () => {
    mockedStorage.getPantryItems.mockResolvedValueOnce([{ id: 'p1', userId: 'user-1', name: 'Milk' } as any]);

    const response = await request(app).get('/api/pantry').query({ userId: 'user-1' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 'p1', userId: 'user-1', name: 'Milk' }]);
    expect(mockedStorage.getPantryItems).toHaveBeenCalledWith('user-1');
  });

  it('creates a donation entry', async () => {
    mockedStorage.getUser.mockResolvedValueOnce({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'Donor',
      userCategory: 'Household',
      avatar: null,
      foodSaved: 0,
      donationsMade: 0,
      co2Reduced: 0,
      mealsProvided: 0,
    } as any);
    mockedStorage.addDonation.mockResolvedValueOnce({ id: 'd1', userId: 'user-1', title: 'Milk', status: 'pending' } as any);

    const response = await request(app)
      .post('/api/donations')
      .send({ userId: 'user-1', title: 'Milk', foodCategory: 'Dairy', quantity: '1', unit: 'pcs' });

    expect(response.status).toBe(201);
    expect(mockedStorage.addDonation).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', title: 'Milk' }));
    expect(response.body).toMatchObject({ userId: 'user-1', status: 'pending' });
  });

  it('scans an image and returns parsed food data', async () => {
    const response = await request(app)
      .post('/api/scan')
      .send({ imageBase64: 'abc123', mediaType: 'image/jpeg' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: 'Apple', category: 'Fruits' });
  });
});