import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import BusinessMarker from './BusinessMarker';
import bigCityImage from '../assets/bigcity2.png';
import eagleImage from '../assets/aguila_negra.png';

const CityMap = () => {
  const navigate = useNavigate();
  const [hoveredBusiness, setHoveredBusiness] = useState(null);
  const [businesses, setBusinesses] = useState([]);

   useEffect(() => {
  const businessData = [
    { id: 1, type: 'GYM', x: 2, y: 73 },          // 1 (abajo izquierda)
    { id: 2, type: 'Carnicería', x: 6, y: 75 },    // 2
    { id: 3, type: 'Minisupermercado', x: 13, y: 70 }, // 3
    { id: 4, type: 'Restaurante', x: 30, y: 70 },    // 4 (centro)
    { id: 5, type: 'Taller mecánico', x: 23, y: 73 }, // 5
    { id: 6, type: 'Salón de belleza', x: 70, y: 70 }, // 6
    { id: 7, type: 'Bar', x: 76, y: 67 },            // 7 (arriba derecha)
    { id: 8, type: 'Escuela', x: 30, y: 45 },        // 8 (arriba izquierda)
    { id: 9, type: 'Otros', x: 55, y: 25 },          // 9 (abajo derecha)
    { id: 10, type: 'Librería', x: 55, y: 55 },      // 10
    { id: 11, type: 'Cafetería', x: 80, y: 65 },     // 11
    { id: 12, type: 'Farmacia', x: 87, y: 67 },      // 12
    { id: 13, type: 'Fábrica', x: 80, y: 47 }        // 13
  ];
  setBusinesses(businessData);
}, []);

  const handleMarkerClick = (businessType) => {
    navigate('/register', {
      state: {
        fromMap: true,
        businessType: businessType
      }
    });
  };

  return (
    <Box sx={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      overflow: 'hidden',
      background: `url(${bigCityImage}) no-repeat center center`,
      backgroundSize: 'cover',
      cursor: 'default',
    }}>
      {/* Botón de Login superior izquierdo */}
      <Button
        component={Link}
        to="/login"
        variant="contained"
        sx={{
          position: 'absolute',
          top: 18,
          right: 18,
          zIndex: 10,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          color: '#1976d2',
          '&:hover': {
            backgroundColor: 'white',
          }
        }}
      >
        Iniciar Sesión
      </Button>

      {/* Overlay oscuro */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.3)',
        zIndex: 0,
      }} />

      {/* Título principal con águila */}
      <Box sx={{
        position: 'absolute',
        top: '5%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1,
        textAlign: 'center',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Typography variant="h3" sx={{
          color: 'white',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
        }}>
          Gestor de Nóminas Mexicanas
          <Box 
            component="img"
            src={eagleImage}
            sx={{
              height: '1.5em',
              marginLeft: '-5px',
              filter: 'brightness(0) invert(1)',
            }}
            alt="Águila mexicana"
          />
        </Typography>
      </Box>

      {/* Subtítulos */}
      <Box sx={{
        position: 'absolute',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1,
        textAlign: 'center',
        width: '100%',
      }}>
        <Typography variant="h4" sx={{
          color: 'white',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)',
          fontWeight: 'bold',
          mb: 1,
        }}>
          ¿Cuál es tu negocio?
        </Typography>
        <Typography variant="h5" sx={{
          color: 'white',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)',
          fontStyle: 'italic',
        }}>
          Regístrate gratis y procesa tu nómina en este simulador gratuito
        </Typography>
      </Box>

      {/* Marcadores de negocios */}
      {businesses.map((business) => (
        <BusinessMarker
          key={business.id}
          type={business.type}
          x={business.x}
          y={business.y}
          isHovered={hoveredBusiness === business.type}
          onClick={() => handleMarkerClick(business.type)}
          onMouseEnter={() => setHoveredBusiness(business.type)}
          onMouseLeave={() => setHoveredBusiness(null)}
        />
      ))}
    </Box>
  );
};

export default CityMap;