import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import BusinessMarker from './BusinessMarker';
import cityMapImage from '../assets/citytown.png';

const CityMap = () => {
  const navigate = useNavigate();
  const [hoveredBusiness, setHoveredBusiness] = useState(null);
  const [businesses, setBusinesses] = useState([]);

  // Configuración de los negocios basada en tu imagen
  useEffect(() => {
    const businessTypes = [
      'escuela', 'importadora', 'taller de costura', 
      'siripe', 'carniceria', 'fabrica', 
      'restaurante', 'libreria', 'taller mecanico', 'minisuper'
    ];

    // Posiciones aproximadas (ajusta según tu imagen)
    const positions = [
      { x: 20, y: 30 }, { x: 35, y: 25 }, { x: 50, y: 40 },
      { x: 65, y: 35 }, { x: 30, y: 60 }, { x: 70, y: 20 },
      { x: 80, y: 45 }, { x: 40, y: 50 }, { x: 25, y: 70 },
      { x: 50, y: 80 }
    ];

    setBusinesses(businessTypes.map((type, index) => ({
      id: index + 1,
      type,
      x: positions[index].x,
      y: positions[index].y
    })));
  }, []);

  const handleMarkerClick = (businessType) => {
    // Navegar directamente al registro con el tipo de negocio seleccionado
    navigate('/register', {
      state: {
        fromMap: true,
        businessType: businessType
      }
    });
  };

  const handleMarkerHover = (businessType) => {
    setHoveredBusiness(businessType);
  };

  return (
    <Box sx={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      overflow: 'hidden',
      background: `url(${cityMapImage}) no-repeat center center`,
      backgroundSize: 'cover',
      cursor: 'default',
    }}>
      {/* Mapa de fondo */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.2)',
        zIndex: 0,
      }} />

      {/* Título principal */}
      <Typography variant="h3" sx={{
        position: 'absolute',
        top: '5%',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'white',
        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
        zIndex: 1,
        textAlign: 'center',
        width: '100%',
      }}>
        GESTOR DE NÓMINAS
      </Typography>

      {/* Subtítulo */}
      <Typography variant="h5" sx={{
        position: 'absolute',
        top: '12%',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'white',
        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
        zIndex: 1,
        textAlign: 'center',
        width: '100%',
      }}>
        ¿Cuál es tu negocio?
      </Typography>

      {/* Marcadores de negocios */}
      {businesses.map((business) => (
        <BusinessMarker
          key={business.id}
          type={business.type}
          x={business.x}
          y={business.y}
          isHovered={hoveredBusiness === business.type}
          onClick={() => handleMarkerClick(business.type)}
          onMouseEnter={() => handleMarkerHover(business.type)}
          onMouseLeave={() => handleMarkerHover(null)}
        />
      ))}

      {/* Indicación para el usuario */}
      <Typography variant="body1" sx={{
        position: 'absolute',
        bottom: '5%',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'white',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '8px 16px',
        borderRadius: '4px',
        textAlign: 'center',
        zIndex: 1,
      }}>
        Desplaza el cursor sobre la ciudad para descubrir los negocios disponibles
      </Typography>
    </Box>
  );
};

export default CityMap;