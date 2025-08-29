import { getAllUserPoints , getPointsHistory,redeemPoints} from "../models/pointsModel.js";

  export const checkScratchCardEligibility = async (req, res) => {
    try {
      const  first_login_gift  = req.user.first_login_gift;
      const  welcome_gift_expiry = req.user.welcome_gift_expiry ;
      
      res.json({ 
        eligible: first_login_gift ,
        welcome_gift_expiry:welcome_gift_expiry,
        message: first_login_gift ? 'User is eligible for welcome gift' : 'User has already claimed welcome gift'
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };

export const getUserPoints = async (req, res) => {
  try {
    const userId = req.user.id;
    const userPoints = await getAllUserPoints(userId);

    res.status(200).json({
      success: true,
      data: userPoints
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching points balance',
      error: error.message
    });
  }
};

export const getUserPointsHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, action } = req.query;
    const skip = (page - 1) * limit;

    const { history, total } = await getPointsHistory({
      userId,
      action,
      skip,
      limit: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      data: history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching points history',
      error: error.message
    });
  }
};

export const RedemptionOptions = () => {
  return [
  { points: 50, discount: '$2 Off Next Purchase', id: '2_off' },
  { points: 100, discount: '$5 Off Next Purchase', id: '5_off' },
  { points: 200, discount: '$12 Off Next Purchase', id: '12_off' },
  { points: 500, discount: '$30 Off Next Purchase', id: '30_off' }
]
};

export const getRedemptionOptions = (req, res) => {
  try {
    const options = RedemptionOptions();
    
    res.status(200).json({
      success: true,
      data: options 
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching redemption options'
    });
  }
};

export const getLevelInfo = async (userId) => {
  const userPoints = await getAllUserPoints(userId);
  
  if (!userPoints) {
    return {
      level: "Bronze Member",
      progress: 0,
      nextLevel: "Silver Member",
      availablePoints: 0,
      totalPointsEarned: 0,
      nextRewardAt: 100 
    };
  }

  const totalPoints = userPoints.totalPointsEarned;
  let level, nextLevel, progress, pointsToNextLevel;

  if (totalPoints >= 500) {
    level = "Gold Member";
    nextLevel = "Gold Member";
    progress = 100;
    pointsToNextLevel = 0;
  } else if (totalPoints >= 200) {
    level = "Silver Member";
    nextLevel = "Gold Member";
    pointsToNextLevel = 500 - totalPoints;
    progress = Math.min(100, Math.floor(((totalPoints - 200) / 300) * 100));
  } else {
    level = "Bronze Member";
    nextLevel = "Silver Member";
    pointsToNextLevel = 200 - totalPoints;
    progress = Math.min(100, Math.floor((totalPoints / 200) * 100));
  }

  const redemptionOptions = RedemptionOptions();
  const nextReward = redemptionOptions.find(option => 
    userPoints.availablePoints < option.points
  );
  
  const nextRewardAt = nextReward ? nextReward.points - userPoints.availablePoints : 0;
  const nextRewardDescription = nextReward ? nextReward.discount : "Max rewards reached";

  return {
    level,
    progress,
    nextLevel,
    pointsToNextLevel,
    availablePoints: userPoints.availablePoints,
    totalPointsEarned: userPoints.totalPointsEarned,
    nextRewardAt,
    nextRewardDescription
  };
};
export const getUserLevelInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const levelInfo = await getLevelInfo(userId); 

    res.status(200).json({
      success: true,
      data: levelInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user level info',
      error: error.message
    });
  }
};

export const redeemUserPoints = async (req, res) => {
  try {
    const { rewardId } = req.params; 
    const userId = req.user.id;
    
    const redemptionOptions = RedemptionOptions();
    const reward = redemptionOptions.find(opt => opt.id === rewardId);
    
    let discountAmount = 0;
  switch (rewardId) {
    case '2_off':
      discountAmount = 2;
      break;
    case '5_off':
      discountAmount = 5;
      break;
    case '12_off':
      discountAmount = 12;
      break;
    case '30_off':
      discountAmount = 30;
      break;
    default:
      discountAmount = 0;
  }

    if (!reward) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reward selected'
      });
    }

    const result = await redeemPoints(userId, reward.points, rewardId,discountAmount);
    
    res.status(200).json({
      success: true,
      message: `Successfully redeemed ${reward.discount}`,
      data: result 
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
