import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { customers, pledges, pledgeArticles } from '../db/schema.js';
import { eq, sql, desc, or } from 'drizzle-orm';
import { authenticate } from '../middlewares/auth.middleware.js';
import { computePledgeStatus } from './pledge.routes.js';

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/dashboard/summary
  fastify.get('/summary', async (request, reply) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const startOfMonthStr = `${todayStr.slice(0, 7)}-01`;

      // 1. Total Customers
      const custCountRes = await db.select({ count: sql<number>`count(*)::int` }).from(customers);
      const totalCustomers = custCountRes[0]?.count || 0;

      // 2. Fetch all pledges to calculate dynamic metrics accurately
      const allPledges = await db
        .select({
          id: pledges.id,
          pledgeNumber: pledges.pledgeNumber,
          pledgeDate: pledges.pledgeDate,
          dueDate: pledges.dueDate,
          metalType: pledges.metalType,
          totalLoanAmount: pledges.totalLoanAmount,
          totalGrossWeight: pledges.totalGrossWeight,
          totalNetWeight: pledges.totalNetWeight,
          status: pledges.status,
          closedDate: pledges.closedDate,
          createdAt: pledges.createdAt,
        })
        .from(pledges);

      let totalActiveGirvi = 0;
      let totalClosedGirvi = 0;
      let totalLoanAmount = 0;
      let totalJewelleryWeight = 0;
      let overduePledges = 0;
      let pledgesDueToday = 0;
      let pledgesDueThisMonth = 0;

      // Divided Gold & Silver metrics
      let totalGoldActivePledges = 0;
      let totalSilverActivePledges = 0;
      let totalGoldWeight = 0;
      let totalSilverWeight = 0;
      let totalGoldLoan = 0;
      let totalSilverLoan = 0;
      let totalGoldPledges = 0;
      let totalSilverPledges = 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const p of allPledges) {
        const isGold = (p.metalType || 'Gold') === 'Gold';
        if (isGold) {
          totalGoldPledges++;
        } else {
          totalSilverPledges++;
        }

        const dynamicStatus = computePledgeStatus(p.status, p.dueDate, p.closedDate);

        if (dynamicStatus === 'closed') {
          totalClosedGirvi++;
        } else if (dynamicStatus !== 'cancelled') {
          totalActiveGirvi++;
          const loan = parseFloat(p.totalLoanAmount) || 0;
          const netWt = parseFloat(p.totalNetWeight) || 0;

          totalLoanAmount += loan;
          totalJewelleryWeight += netWt;

          if (isGold) {
            totalGoldActivePledges++;
            totalGoldWeight += netWt;
            totalGoldLoan += loan;
          } else {
            totalSilverActivePledges++;
            totalSilverWeight += netWt;
            totalSilverLoan += loan;
          }

          if (dynamicStatus === 'overdue') {
            overduePledges++;
          }

          if (p.dueDate === todayStr) {
            pledgesDueToday++;
          }

          if (p.dueDate >= startOfMonthStr && p.dueDate.slice(0, 7) === todayStr.slice(0, 7)) {
            pledgesDueThisMonth++;
          }
        }
      }

      // 3. Recently created pledges (last 5)
      const recentPledges = await db
        .select({
          pledge: pledges,
          customerName: customers.name,
          customerMobile: customers.mobileNumber,
        })
        .from(pledges)
        .leftJoin(customers, eq(pledges.customerId, customers.id))
        .orderBy(desc(pledges.createdAt))
        .limit(6);

      const recentFormatted = recentPledges.map(r => ({
        ...r.pledge,
        status: computePledgeStatus(r.pledge.status, r.pledge.dueDate, r.pledge.closedDate),
        customerName: r.customerName,
        customerMobile: r.customerMobile,
      }));

      return reply.send({
        success: true,
        data: {
          totalCustomers,
          totalActiveGirvi,
          totalClosedGirvi,
          totalLoanAmount,
          totalJewelleryWeight,
          overduePledges,
          pledgesDueToday,
          pledgesDueThisMonth,
          totalGoldActivePledges,
          totalSilverActivePledges,
          totalGoldWeight,
          totalSilverWeight,
          totalGoldLoan,
          totalSilverLoan,
          totalGoldPledges,
          totalSilverPledges,
          recentPledges: recentFormatted,
        },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to retrieve dashboard summary' });
    }
  });

  // GET /api/dashboard/analytics
  fastify.get('/analytics', async (request, reply) => {
    try {
      // Monthly trend for the past 6 months
      const monthlyRegistrationsMap: Record<string, { count: number; loanAmount: number }> = {};

      const now = new Date();
      const monthLabels: string[] = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toISOString().slice(0, 7); // YYYY-MM
        const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthLabels.push(label);
        monthlyRegistrationsMap[key] = { count: 0, loanAmount: 0 };
      }

      const allPledges = await db
        .select({
          pledgeDate: pledges.pledgeDate,
          totalLoanAmount: pledges.totalLoanAmount,
          status: pledges.status,
          dueDate: pledges.dueDate,
          closedDate: pledges.closedDate,
        })
        .from(pledges);

      let activeCount = 0;
      let closedCount = 0;
      let overdueCount = 0;

      for (const p of allPledges) {
        const monthKey = p.pledgeDate.slice(0, 7);
        if (monthlyRegistrationsMap[monthKey]) {
          monthlyRegistrationsMap[monthKey].count += 1;
          monthlyRegistrationsMap[monthKey].loanAmount += parseFloat(p.totalLoanAmount) || 0;
        }

        const dynStatus = computePledgeStatus(p.status, p.dueDate, p.closedDate);
        if (dynStatus === 'closed') {
          closedCount++;
        } else if (dynStatus === 'overdue') {
          overdueCount++;
          activeCount++;
        } else if (dynStatus !== 'cancelled') {
          activeCount++;
        }
      }

      const monthlyTrend = Object.entries(monthlyRegistrationsMap).map(([key, val]) => {
        const [year, month] = key.split('-');
        const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
        return {
          month: dateObj.toLocaleString('default', { month: 'short' }),
          key,
          registrations: val.count,
          disbursements: val.loanAmount,
        };
      });

      const statusDistribution = [
        { name: 'Active', value: activeCount, color: '#0F1E36' },
        { name: 'Closed', value: closedCount, color: '#10B981' },
        { name: 'Overdue', value: overdueCount, color: '#EF4444' },
      ];

      return reply.send({
        success: true,
        data: {
          monthlyTrend,
          statusDistribution,
        },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to retrieve analytics' });
    }
  });
}
