import { mockingData, Product } from "./Product";

type ProductEvent = {
    productId: string;
}

export async function main(event: ProductEvent): Promise<Product | undefined> {
    const product = mockingData.find(mockProduct => mockProduct.id === event.productId);
    return product;
}
