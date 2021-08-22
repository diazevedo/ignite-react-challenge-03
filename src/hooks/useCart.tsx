import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) return JSON.parse(storagedCart);

    return [];
  });

  const cartToLocalStorage = (): void => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  };

  const addProduct = async (productId: number) => {
    try {
      const cartCopy = [...cart];
      const isProductInTheCart = cartCopy.find(
        (product) => product.id === productId
      );
      const stock = await api.get<Stock>(`/stock/${productId}`);
      let currentAmount = 1;

      if (isProductInTheCart) {
        currentAmount = isProductInTheCart.amount + 1;
      }

      if (currentAmount > stock.data.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (!isProductInTheCart) {
        const product = await api.get<Product>(`/products/${productId}`);
        cartCopy.push({ ...product.data, amount: currentAmount });
      } else {
        isProductInTheCart.amount = currentAmount;
      }

      setCart(cartCopy);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartCopy));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex((p) => p.id === productId);
      if (productIndex < 0) {
        throw new Error();
      }

      const updatedCart = [...cart];
      updatedCart.splice(productIndex, 1);
      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        throw new Error();
      }

      const stock = await api.get<Stock>(`/stock/${productId}`);

      if (stock.data.amount < amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const cartUpdated = cart.map((product) => {
        if (product.id === productId) {
          product.amount = amount;
        }
        return product;
      });

      setCart(cartUpdated);
      cartToLocalStorage();
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
