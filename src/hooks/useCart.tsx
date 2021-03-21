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

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productAlredyInCart = cart.find(
        (product) => product.id === productId
      );

      if (!productAlredyInCart) {
        const { data: product } = await api.get<Product>(
          `products/${productId}`
        );

        const { data: stock } = await api.get<Stock>(`stock/${productId}`);

        if (stock.amount > 0) {
          setCart([...cart, { ...product, amount: 1 }]);

          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify([...cart, { ...product, amount: 1 }])
          );
          toast("Adicionado");
          return;
        }
      }

      if (productAlredyInCart) {
        const { data: stock } = await api.get<Stock>(`stock/${productId}`);

        if (stock.amount > productAlredyInCart.amount) {
          const updatedCart = cart.map((cartItem) =>
            cartItem.id === productId
              ? {
                  ...cartItem,
                  amount: Number(cartItem.amount) + 1,
                }
              : cartItem
          );

          setCart(updatedCart);

          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify(updatedCart)
          );

          toast("Adicionado");
          return;
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      //procurando no array do carrinho, se existe o produto que está tentando ser removido do carrinho
      const productExists = cart.some(
        (cartProduct) => cartProduct.id === productId
      );

      //se esse produto não existir, mostra um erro
      if (!productExists) {
        toast.error("Erro na remoção do produto");
        return;
      }

      //se ele existir, filtra-se os itens contido no carrinho q nao tem o id q foi passado para remover, ou seja, só iram ter nesse novo array, os itens que não foram pedidos para serem removidos
      const updatedCart = cart.filter((cartItem) => cartItem.id !== productId);

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
        toast.error("Erro na alteração de quantidade do produto");

        return;
      }

      const { data } = await api.get(`stock/${productId}`);

      //pegando o total de itens no estoque desse produto
      const productAmount = data.amount;

      const stockIsNotAvailable = amount > productAmount;

      //se não tiver no estoque, o suficiente q o usuário está requerindo, retorna mensagem
      if (stockIsNotAvailable) {
        toast.error("Quantidade solicitada fora de estoque");

        return;
      }

      //verificando se o produto que o usuário quer aumentar mais uma unidade no carrinho, existe no banco
      const productExists = cart.some(
        (cartProduct) => cartProduct.id === productId
      );

      //se o produto não existir no carrinho, retorna erro
      if (!productExists) {
        toast.error("Erro na alteração de quantidade do produto");

        return;
      }

      //gerando novo array com a quantia do item atualizada
      const updatedCart = cart.map((cartItem) =>
        cartItem.id === productId
          ? {
              ...cartItem,
              amount,
            }
          : cartItem
      );

      setCart(updatedCart);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
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
