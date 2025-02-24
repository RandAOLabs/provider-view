import React from 'react';
import { Outlet } from 'react-router-dom';
import { ProductsNav } from '../../components/products/ProductsNav';

export const Products = () => {
  return (
    <div className="products-container">
      <ProductsNav />
      <Outlet />
    </div>
  );
};
