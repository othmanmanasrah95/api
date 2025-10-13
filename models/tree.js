const mongoose = require('mongoose');

const treeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a tree name'],
    trim: true
  },
  species: {
    type: String,
    required: [true, 'Please add the tree species'],
    trim: true
  },
  location: {
    type: String,
    required: [true, 'Please add the tree location'],
    trim: true
  },
  plantedDate: {
    type: Date,
    required: [true, 'Please add the planting date']
  },
  height: {
    type: String,
    required: [true, 'Please add the tree height']
  },
  co2Absorbed: {
    type: String,
    required: [true, 'Please add CO2 absorption rate']
  },
  adoptionPrice: {
    type: Number,
    required: [true, 'Please add the adoption price']
  },
  images: [{
    type: String,
    required: [true, 'Please add at least one image']
  }],
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  benefits: [String],

  adopters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  maxAdopters: {
    type: Number,
    required: [true, 'Please add maximum number of adopters']
  },

  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please specify the farmer']
  },

  status: {
    type: String,
    enum: ['Available', 'Fully Adopted'],
    default: 'Available'
  },

  // 🆕 Type of program this tree belongs to
  programType: {
    type: String,
    enum: ['adoption', 'planting'],
    default: 'adoption'
  },

  // 🆕 Who funded the planting (for planting program only)
  plantedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  updates: [{
    date: {
      type: Date,
      default: Date.now
    },
    title: String,
    content: String,
    image: String
  }],

  // NFT-related
  zytTokenId: {
    type: String
  },
  metadataURI: {
    type: String
  },
  nftMinted: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual: progress %
treeSchema.virtual('progress').get(function () {
  return (this.adopters.length / this.maxAdopters) * 100;
});

// Auto-update status
treeSchema.pre('save', function (next) {
  if (this.adopters.length >= this.maxAdopters) {
    this.status = 'Fully Adopted';
  }
  next();
});

module.exports = mongoose.model('Tree', treeSchema);
