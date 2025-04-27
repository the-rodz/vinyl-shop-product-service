export type Product = {
    id: string | undefined;
    title: string;
    description: string;
    price: number;
};

export const mockingData: Product[] = [
    {
        id: '1',
        title: "The Dark Side Of the Moon",
        description: "50th Anniversary Edition",
        price: 89.99,
    },
    {
        id: '2',
        title: 'Abbey Road',
        description: 'Edition Deluxe - 2LPs',
        price: 49.84
    },
    {
        id: '3',
        title: 'In Rainbows',
        description: 'LP Color Edition',
        price: 39.99,
    },
    {
        id: '4',
        title: 'Artaud',
        description: 'Vinyl',
        price: 42.88,
    },
    {
        id: '5',
        title: 'Glow On',
        description: 'Color Edition 2LP',
        price: 19.32,
    },
    {
        id: '6',
        title: 'Roseland NYC Live',
        description: '25th Anniversary 2LP Red',
        price: 66.65,
    },
];
