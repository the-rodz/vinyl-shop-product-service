import { mockingData, Product } from "./Product";

export async function main(event: string): Promise<Product[]> {
    return mockingData;
};