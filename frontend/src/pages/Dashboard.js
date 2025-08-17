// Dashboard.js
import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function Dashboard() {
  const [empresas, setEmpresas] = useState([]);

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const response = await api.get('/empresas/');
        setEmpresas(response.data);
      } catch (error) {
        console.error(
          'Error al obtener empresas:',
          error.response?.data || error.message
        );
      }
    };

    fetchEmpresas();
  }, []);

  return (
    <div>
      <h1>Dashboard Privado</h1>
      <h2>Lista de Empresas</h2>
      {empresas.length > 0 ? (
        <ul>
          {empresas.map((emp) => (
            <li key={emp.id}>{emp.nombre}</li>
          ))}
        </ul>
      ) : (
        <p>No hay empresas registradas aún.</p>
      )}
    </div>
  );
}
