export type TravelOrderEmployee = {
  employeeId: string;
  employeeNumber: string;
  name: string;
};

export type TravelOrder = {
  id: string;
  employees: TravelOrderEmployee[];
  startDate: string;
  endDate: string;
  remarks?: string;
  createdAt: string;
};
