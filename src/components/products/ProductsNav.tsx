import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import './ProductsNav.css';

const products = [
  { name: 'Raffle', path: '/products/raffle' },
  { name: 'Lootbox', path: '/products/lootbox' },
  { name: 'Critical Strike', path: '/products/criticalstrike' },
  { name: 'Lottery', path: '/products/lottery' },
  { name: 'Random Number', path: '/products/randomnumber' }
];

export const ProductsNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isProductPage = location.pathname.startsWith('/products');

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const currentProduct = products.find(p => 
    location.pathname === p.path || 
    (location.pathname === '/products' && p.path === '/products/raffle')
  )?.name || 'Products';

  return (
    <div className="products-nav">
      <div className="products-dropdown" onClick={toggleDropdown}>
        <span>{currentProduct}</span>
        {isOpen ? <FiChevronUp /> : <FiChevronDown />}
      </div>
      {isOpen && (
        <div className="products-menu">
          {products.map(product => (
            <NavLink
              key={product.path}
              to={product.path}
              className={({ isActive }) => `product-link ${
                isActive || (location.pathname === '/products' && product.path === '/products/raffle') 
                  ? 'active' 
                  : ''
              }`}
              onClick={() => setIsOpen(false)}
            >
              {product.name}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};
