const mongoose = require('mongoose');

const ProductTransactionSchema = new mongoose.Schema({
  id : { type:String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  dateOfSale: { type: Date, required: true },
  category: { type: String, required: true },
  image: { type: String, default: 'https://via.placeholder.com/150' }, 
  sold: { type: Boolean, default: false },
});

module.exports = mongoose.model('Product', ProductTransactionSchema);
