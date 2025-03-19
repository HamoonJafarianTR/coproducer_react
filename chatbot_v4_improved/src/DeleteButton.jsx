import React from "react";
import PropTypes from "prop-types";
import DeleteIcon from '@mui/icons-material/Delete'; 

function DeleteButton({ onClick }) {  
  return (  
    <DeleteIcon  
      onClick={onClick}  
      style={{ cursor: 'pointer' }}  
      aria-label="Delete"  
    />  
  );  
}

DeleteButton.propTypes = {
  onClick: PropTypes.func.isRequired
};
    
export default DeleteButton;  