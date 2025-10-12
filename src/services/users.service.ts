import { sequelize } from "@src/config/database";
import AWS from "aws-sdk";
import { addDays } from "date-fns";

import {
  admin,
  duplicateData,
  employee,
  industry,
  like,
  pushNotification,
  roleData,
  userLog,
  userNotification,
  users,
  threads,
  messages,
  privateThreads,
  privateMessages,
  toxicityScores,
  report
} from "@src/models";
import { sendPushNotification } from "@src/utils/pushNotification";
import { sendEmail } from "@src/utils/sendEmail";
import bcrypt from "bcrypt";
import { profile } from "console";
import jwt from "jsonwebtoken";
import { Op, Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { faker } from "@faker-js/faker";
import { languages } from "@src/shared/common/commonList";
import { getProcessedTemplate } from "@src/utils/renderEmailTemplate";
import { title } from "process";
import { userInfo } from "os";

export class UserService {
  public createAccount = async (data: any): Promise<any> => {
    const { email, password, confirmPassword } = data;
    const isUserExist: any = await users.findOne({ where: { email } });
    if (isUserExist) {
      throw new Error("E-mail bestaat al.");
    }
    const isEmployeeUserExist: any = await employee.findOne({ where: { email } });
    if (isEmployeeUserExist) {
      throw new Error("E-mail bestaat al.");
    }

    if (password != confirmPassword) {
      throw new Error("De velden Wachtwoord en Bevestig wachtwoord moeten hetzelfde zijn.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const OTP = generateOTP();
    const name = await generateRandomName()

    const userObj = {
      ...data,
      password: hashedPassword,
      OTP,
      emailVerified: false,
      isOtpUsed: false,
      otpCreatedAt: new Date(),
      name: name
    };

    // const isEmailSend: any = await sendEmail({
    //   from: String(process.env.EMAIL),
    //   to: email,
    //   subject: "Welcome to Bossie App! Please Verify Your Email",
    //   text: `Hi ${data.name},

    //         Thank you for signing up with our app! To verify your email address and activate your account, please use this OTP:

    //         ${OTP}

    //         Sincerely,

    //         The Bossie Team`,
    //   // text: "saqib"

    // });

    const emailHtml = getProcessedTemplate("login_otp", { username: name, otp: OTP });
    const isEmailSend: any = await sendEmail({
      from: String(process.env.EMAIL),
      to: email,
      subject: "Welkom bij de Bossie-app! Verifieer uw e-mailadres.",
      html: emailHtml,
    });

    if (!isEmailSend) {
      throw new Error("Fout bij het verzenden van e-mail.");
    }

    let response: any = await users.create(userObj);
    const res = {
      id: response?.id,
      name: response?.name,
      email: response?.email,
      emailVerified: response?.emailVerified,
      roleId: response?.roleId,
    };
    return res;
  };

  public resendOtp = async (data: any): Promise<any> => {
    const { userId, roleId, atLogin } = data;
    var userExist: any;
    var name: any;
    if (roleId != 3) {
      userExist = await users.findOne({
        where: { id: userId, deletedAt: null },
        include: [{
          as: 'roleData',
          model: roleData,
          attributes: ["companyName", "firstName", "lastName"]
        }]
      });
      if (roleId == 2) {
        name = userExist.roleData.companyName ? userExist.roleData.companyName : userExist.name
      } else {
        name = `${userExist.roleData.firstName} ${userExist.roleData.lastName}`
      }

    } else {
      userExist = await employee.findOne({
        where: { id: userId, deletedAt: null },
      });
      name = `${userExist.firstName} ${userExist.lastName}`
    }

    if (!userExist) {
      throw new Error("Gebruiker bestaat niet.");
    }

    if (
      isWithinTimeLimit(
        atLogin ? userExist.otpCreatedAt : userExist.forgotPassOtpCreatedAt,
        2
      )
    ) {
      const remainingTime = await calculateRemainingTime(
        atLogin ? userExist.otpCreatedAt : userExist.forgotPassOtpCreatedAt,
        2
      );
      throw new Error(`Probeer het daarna opnieuw ${remainingTime}`);
    }

    let emailWelcome = "Welkom bij de Bossie-app! Verifieer uw e-mailadres.";
    let forgotPassWelcome = "Bossie: Stel uw wachtwoord opnieuw in.";
    let emailMessage =
      "Thank you for signing up with our app! To verify your email address and activate your account, please use this OTP:";
    let forgotPassMessage = "To reset your password, please use this OTP:";
    // let name =
    //   roleId != 3
    //     ? userExist.name
    //     : userExist.firstName + " " + userExist.lastName;
    const OTP = generateOTP();
    // const isEmailSend: any = await sendEmail({
    //   from: String(process.env.EMAIL),
    //   to: userExist.email,
    //   subject: `${atLogin ? emailWelcome : forgotPassWelcome}`,
    //   text: `Hi ${name},

    //     ${atLogin ? emailMessage : forgotPassMessage}

    //     ${OTP}

    //     Sincerely,

    //     The Bossie Team`,
    // });
    var emailHtml: any;
    if (atLogin) {
      emailHtml = getProcessedTemplate("login_otp", { username: name, otp: OTP });
    } else {
      emailHtml = getProcessedTemplate("reset_password", { username: name, otp: OTP });
    }
    console.log("emailHtml", emailHtml);

    const isEmailSend: any = await sendEmail({
      from: String(process.env.EMAIL),
      to: userExist.email,
      subject: `${atLogin ? emailWelcome : forgotPassWelcome}`,
      html: emailHtml,
    });

    if (!isEmailSend) {
      throw new Error("Fout bij het verzenden van e-mail.");
    }

    if (atLogin) {
      var usersObj: any = {
        OTP: OTP,
        isOtpUsed: false,
        otpCreatedAt: new Date(),
      };
    } else {
      var usersObj: any = {
        forgotPassOTP: OTP,
        isForgotPassOtpUsed: false,
        forgotPassOtpCreatedAt: new Date(),
      };
    }

    const tableName = roleId !== 3 ? "users" : "employee";

    // Dynamically get the model
    const Model = sequelize.models[tableName];
    const userResponse: any = await Model.update(
      { ...usersObj, updatedAt: new Date() },
      {
        where: {
          id: userId,
        },
      }
    );
    return {
      id: userExist.id,
      roleId: userExist.roleId,
      email: userExist.email,
    };
  };

  public validateOtp = async (data: any): Promise<any> => {
    const { userId, roleId, OTP, atLogin, fcmToken } = data;
    let userExist: any;
    let userResponse: any;
    let token: any;
    let response: any;
    const secret = process.env.SECRET_KEY as string;

    if (roleId != 3) {
      userExist = await users.findOne({
        where: { id: userId, deletedAt: null },
      });
    } else {
      userExist = await employee.findOne({
        where: { id: userId, deletedAt: null }
      });
    }

    if (!userExist) {
      throw new Error("Gebruiker bestaat niet.");
    }

    if (atLogin) {
      const isOTPValid =
        OTP === userExist.OTP &&
        isWithinTimeLimit(userExist.otpCreatedAt, 2) &&
        !userExist.isOtpUsed;
      if (!isOTPValid) {
        throw new Error("OTP is ongeldig of verlopen.");
      }

      var usersObj: any = {
        emailVerified: true,
        isOtpUsed: true,
        fcmToken: fcmToken,
        lastLogin: new Date()
      };
    } else {
      const isOTPValid =
        OTP === userExist.forgotPassOTP &&
        isWithinTimeLimit(userExist.forgotPassOtpCreatedAt, 2) &&
        !userExist.isForgotPassOtpUsed;
      if (!isOTPValid) {
        throw new Error("OTP is ongeldig of verlopen.");
      }

      var usersObj: any = {
        isForgotPassOtpUsed: true,
      };
    }

    token = jwt.sign(
      {
        id: userExist.id,
        roleId: userExist.roleId,
        isAdmin: false,
      },
      secret,
      { expiresIn: "1D" }
    );

    if (roleId != 3) {
      await users.update(
        { ...usersObj, updatedAt: new Date() },
        { where: { id: userId } }
      );
      userResponse = await users.findOne({
        where: { id: userId, deletedAt: null },
        include: [
          {
            as: "roleData",
            model: roleData,
          },
        ],
      });

      let employeeCount: any = 0;
      if (userResponse.roleId == 2) {
        employeeCount = await employee.count({
          where: { userId: userResponse.id },
        });
      }

      if (userResponse && userResponse?.roleData) {
        const cleanedRoleData = { ...userResponse.roleData.dataValues }; // Assuming dataValues holds the roleData properties
        Object.keys(cleanedRoleData).forEach((key) => {
          if (cleanedRoleData[key] === null) {
            delete cleanedRoleData[key];
          }
        });
        userResponse.roleData = cleanedRoleData;
      }

      response = {
        id: userResponse?.id,
        name: userResponse?.name,
        email: userResponse?.email,
        emailVerified: userResponse?.emailVerified,
        roleId: userResponse?.roleId,
        phone: userResponse?.phone,
        token: token,
        status: userResponse?.profileStatus,
        // isProfileSubmitted: userResponse?.roleData ? 1 : 0,
        // isVideoSubmitted: userResponse?.roleData?.isVideoSubmitted,
        // profileId: userResponse?.roleData?.id,
        // profile: userResponse?.roleData?.profile,
        // profileName: userResponse?.roleData?.companyName
        //   ? userResponse?.roleData?.companyName
        //   : `${userResponse?.roleData?.firstName} ${userResponse?.roleData?.lastName}`,
        firstTimeLogin: userResponse?.firstTimeLogin,
        // isApproved: userResponse?.roleData?.isApproved
        //   ? userResponse?.roleData?.isApproved
        //   : 0,
        // isRejected: userResponse?.roleData?.isRejected
        //   ? userResponse?.roleData?.isRejected
        //   : 0,
        roleData: userResponse?.roleData,
        rejectionReason: userResponse?.rejectionReason,
        employeeCount: employeeCount,
      };
    } else {
      // Get employee data first to access userId
      const employeeData = await employee.findOne({
        where: { id: userId, deletedAt: null }, raw: true
      });
      
      if (!employeeData) {
        throw new Error("Employee not found.");
      }
      
      await employee.update(
        { ...usersObj, updatedAt: new Date() },
        { where: { id: userId } }
      );
      
      // Update lastLogin for the company user when employee logs in
      if (atLogin && employeeData) {
        await users.update(
          { lastLogin: new Date() },
          { where: { id: employeeData.userId } }
        );
      }
      
      userResponse = employeeData;

      const compData: any = await roleData.findOne({ where: { userId: userResponse.userId }, attributes: ["companyName"], raw: true })
      response = {
        id: userResponse.id,
        name: userResponse.firstName + " " + userResponse.lastName,
        firstName: userResponse.firstName,
        lastName: userResponse.lastName,
        email: userResponse.email,
        profile: userResponse.profile,
        currentSituationId: userResponse.currentSituationId,
        token: token,
        roleId: 3,
        isApproved: userResponse.isApproved,
        status: userResponse.profileStatus,
        firstTimeLogin: userResponse.firstTimeLogin,
        roleData: {
          mutedOn: userResponse.mutedOn,
          suspendedOn: userResponse.suspendedOn,
          suspendedDays: userResponse.suspendedDays,
          suspendReason: userResponse.suspendReason,
          mutedDays: userResponse.mutedDays,
          accountStatus: userResponse.accountStatus,
          muteReason: userResponse.muteReason,
        },
        companyData: {
          id: userResponse.userId,
          companyName: compData.companyName,
          roleId: 2
        }
      };
    }

    if (atLogin) {
      console.log("response name", response.name);

      const emailHtml = getProcessedTemplate("after_otp_verification", { username: response.name });
      console.log("emailHtml", emailHtml);

      const isEmailSend: any = await sendEmail({
        from: String(process.env.EMAIL),
        to: userResponse.email,
        subject: "Welkom bij de Bossie App! OTP succesvol geverifieerd.",
        html: emailHtml,
      });
    }

    return response;
  };

  public forgotPassword = async (data: any): Promise<any> => {
    const { email } = data;
    var name: any;
    let userUpdateResponse: any;
    // const userData: any = await users.findOne({ where: { email } });
    const userData: any = await users.findOne({
      where: { email }, include: [{
        as: "roleData",
        model: roleData,
        attributes: ["companyName", "firstName", "lastName"]
      }]
    })
    if (!userData) {
      var employeeData: any = await employee.findOne({ where: { email } });
      if (!employeeData) {
        throw new Error("Gebruiker bestaat niet.");
      }
      name = `${employeeData.firstName}  ${employeeData.lastName}`;
    } else {
      if (userData.roleId == 2) {
        name = userData.roleData.companyName ? userData.roleData.companyName : userData.name
      } else {
        name = `${userData.roleData.firstName} ${userData.roleData.lastName}`
      }
    }

    const OTP = generateOTP();
    const emailHtml = getProcessedTemplate("reset_password", { username: name, otp: OTP });
    console.log("emailHtml", emailHtml);

    const isEmailSend: any = await sendEmail({
      from: String(process.env.EMAIL),
      to: email,
      subject: "Bossie: Stel uw wachtwoord opnieuw in.",
      html: emailHtml, // Use processed HTML
    });
    // const isEmailSend: any = await sendEmail({
    //   from: String(process.env.EMAIL),
    //   to: email,
    //   subject: "Bossie: Reset your Password.",
    //   text: `Hi ${name},

    //         To reset the password, please use this OTP:

    //         ${OTP}


    //         The Bossie Team`,
    // });

    if (!isEmailSend) {
      throw new Error("Fout bij het verzenden van e-mail.");
    }
    const usersObj: any = {
      forgotPassOTP: OTP,
      isForgotPassOtpUsed: false,
      forgotPassOtpCreatedAt: new Date(),
      updatedAt: new Date(),
    };

    if (userData) {
      userUpdateResponse = await users.update(
        { ...usersObj },
        {
          where: {
            id: userData.id,
          },
        }
      );
    } else {
      userUpdateResponse = await employee.update(
        { ...usersObj },
        {
          where: {
            id: employeeData.id,
          },
        }
      );
    }
    if (!userUpdateResponse) {
      throw new Error("Fout bij het bijwerken van het model.");
    }

    const result = userData
      ? { id: userData.id, email: userData.email, roleId: userData.roleId }
      : { id: employeeData.id, email: employeeData.email, roleId: 3 };

    return result;
  };

  public changePassword = async (data: any): Promise<any> => {
    const { id, roleId, password, confirmPassword } = data;
    let userData: any;
    if (roleId != 3) {
      userData = await users.findByPk(id);
    } else {
      userData = await employee.findByPk(id);
    }

    if (!userData) {
      throw new Error("Gebruiker bestaat niet.");
    }
    if (password != confirmPassword) {
      throw new Error("De velden Wachtwoord en Bevestig wachtwoord moeten hetzelfde zijn.");
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const tableName = roleId !== 3 ? "users" : "employee";
    const Model = sequelize.models[tableName];

    const userUpdate = await Model.update(
      { password: hashedPassword },
      { where: { id } }
    );
    if (!userUpdate) {
      throw new Error("Fout bij het bijwerken van het wachtwoord.");
    }
  };

  public loginUser = async (data: any): Promise<any> => {
  const { email, password, fcmToken } = data;

  const userData: any = await users.findOne({ where: { email } });
  if (!userData) {
    // Employee flow
    const employeeData: any = await employee.findOne({ where: { email }, raw: true });
    if (!employeeData) {
      throw new Error("Gebruiker bestaat niet.");
    }

    const checkPassword = bcrypt.compareSync(password, employeeData.password);
    if (!checkPassword) {
      throw new Error("Er is iets misgegaan. Controleer uw e-mailadres en wachtwoord.");
    }

    const companyData: any = await users.findOne({ where: { id: employeeData.userId }, raw: true });
    if (companyData?.profileStatus !== 3) {
      throw new Error("U kunt momenteel niet inloggen. Neem contact op met uw beheerder.");
    }

    const secret = process.env.SECRET_KEY as string;
    const token = jwt.sign(
      {
        id: employeeData.id,
        roleId: 3,
        isAdmin: false,
      },
      secret,
      { expiresIn: "1D" }
    );

    await employee.update(
      { firstTimeLogin: false, fcmToken: fcmToken },
      { where: { id: employeeData.id } }
    );

    // Update lastLogin for the company user
    await users.update(
      { lastLogin: new Date() },
      { where: { id: employeeData.userId } }
    );

    const compData: any = await roleData.findOne({
      where: { userId: employeeData.userId },
      attributes: ["companyName"],
      raw: true,
    });

    // compute suspendUntil & muteUntil for employee
    const suspendUntilEmp = employeeData.suspendedOn && employeeData.suspendedDays
      ? new Date(new Date(employeeData.suspendedOn).getTime() + employeeData.suspendedDays * 24 * 60 * 60 * 1000)
      : null;

    const muteUntilEmp = employeeData.mutedOn && employeeData.mutedDays
      ? new Date(new Date(employeeData.mutedOn).getTime() + employeeData.mutedDays * 24 * 60 * 60 * 1000)
      : null;

    const response = {
      id: employeeData.id,
      name: `${employeeData.firstName} ${employeeData.lastName}`,
      firstName: employeeData.firstName,
      lastName: employeeData.lastName,
      email: employeeData.email,
      profile: employeeData.profile,
      phone: employeeData.phone,
      currentSituationId: employeeData.currentSituationId,
      currentSituationName: employeeData.currentSituationName,
      token: token,
      isApproved: employeeData.isApproved,
      status: employeeData.profileStatus,
      fcmToken: employeeData.fcmToken,
      firstTimeLogin: employeeData.firstTimeLogin,
      roleId: 3,
      roleData: {
        mutedOn: employeeData.mutedOn || null,
        suspendedOn: employeeData.suspendedOn || null,
        suspendedDays: employeeData.suspendedDays ?? null,
        suspendReason: employeeData.suspendReason || null,
        muteReason: employeeData.muteReason || null,
        mutedDays: employeeData.mutedDays ?? null,
        accountStatus: employeeData.accountStatus ?? null,
        suspendUntil: suspendUntilEmp,
        muteUntil: muteUntilEmp,
      },
      companyData: {
        id: employeeData.userId,
        companyName: compData?.companyName || null,
        roleId: 2,
      },
    };

    return response;
  }

  // Normal user flow
  const checkPassword = bcrypt.compareSync(password, userData.password);
  if (!checkPassword) {
    throw new Error("Er is iets misgegaan. Controleer uw e-mailadres en wachtwoord.");
  }

  if (!userData.emailVerified) {
    const OTP = generateOTP();
    const emailHtml = getProcessedTemplate("login_otp", { username: userData.name, otp: OTP });

    const isEmailSend: any = await sendEmail({
      from: String(process.env.EMAIL),
      to: email,
      subject: "Welkom bij de Bossie-app! Verifieer uw e-mailadres.",
      html: emailHtml,
    });

    if (!isEmailSend) {
      throw new Error("Fout bij het verzenden van e-mail.");
    }

    const usersObj: any = {
      OTP: OTP,
      isOtpUsed: false,
      otpCreatedAt: new Date(),
      updatedAt: new Date(),
    };

    await users.update(
      { ...usersObj },
      { where: { id: userData.id } }
    );

    throw {
      message: "Email has been sent to your account, Please verify!",
      response: { id: userData?.id, roleId: userData?.roleId },
    };
  }

  const secret = process.env.SECRET_KEY as string;
  const token = jwt.sign(
    {
      id: userData.id,
      roleId: userData.roleId,
      isAdmin: false,
    },
    secret,
    { expiresIn: "1D" }
  );

  let roleInfo: any = await roleData.findOne({ where: { userId: userData.id } });

  // update user meta
  await users.update(
    { firstTimeLogin: false, fcmToken: fcmToken, lastLogin: new Date() },
    { where: { id: userData.id } }
  );

  let employeeCount: any = 0;
  if (userData.roleId == 2) {
    employeeCount = await employee.count({ where: { userId: userData.id } });
  }

  let cleanedRoleData: any = null;
  if (roleInfo) {
    // handle both raw and model instances
    const rd = roleInfo.dataValues ? { ...roleInfo.dataValues } : { ...roleInfo };

    // remove null values
    Object.keys(rd).forEach((key) => {
      if (rd[key] === null) delete rd[key];
    });

    // calculate suspendUntil & muteUntil
    rd.suspendUntil = rd.suspendedOn && rd.suspendedDays
      ? new Date(new Date(rd.suspendedOn).getTime() + rd.suspendedDays * 24 * 60 * 60 * 1000)
      : null;

    rd.muteUntil = rd.mutedOn && rd.mutedDays
      ? new Date(new Date(rd.mutedOn).getTime() + rd.mutedDays * 24 * 60 * 60 * 1000)
      : null;

    cleanedRoleData = rd;
  }

  const response = {
    id: userData?.id,
    name: userData?.name,
    email: userData?.email,
    emailVerified: userData?.emailVerified,
    roleId: userData?.roleId,
    phone: userData?.phone,
    token: token,
    status: userData?.profileStatus,
    firstTimeLogin: userData?.firstTimeLogin,
    roleData: cleanedRoleData,
    rejectionReason: userData?.rejectionReason,
    employeeCount: employeeCount,
  };

  return response;
};




  public createProfile = async (
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    const { id } = data;
    const userExist: any = await users.findByPk(id, { transaction });
    if (!userExist) {
      throw new Error("Fout bij het verzenden van e-mail.");
    }

    const isRoleData: any = await roleData.findOne({ where: { userId: id }, transaction });
    if (isRoleData) {
      const res: any = await roleData.update(
        { ...data },
        { where: { userId: id }, transaction }
      );
      if (!res) {
        throw new Error("Fout bij het bijwerken van gegevens in het model.");
      }
    } else {
      const res: any = await roleData.create(
        { ...data, userId: id },
        { transaction }
      );
      if (!res) {
        throw new Error("Fout bij het aanmaken van gegevens in het model.");
      }

      const userRec = await formatUserRecord(res.get(), userExist.roleId);
      let typeId: any;
      userExist.roleId == 1 ? (typeId = 3) : (typeId = 1);

      let obj: any = {
        userId: id,
        Status: "pending",
        StatusKey: 3,
        content: `${userRec} wants to join the app and is requesting ID approval`,
        seen: 0,
        typeId: typeId, //company notification
      };
      await userNotification.create({ ...obj }, { transaction });
    }

    await users.update(
      { profileStatus: 6 },
      { where: { id: id }, transaction }
    );
    await userLog.create({ userId: id, isProfileCreated: true, profileCreatedOn: new Date() }, { transaction })
    console.log("here after userlog createion");

    return {
      userId: userExist.id,
      email: userExist.email,
      roleId: userExist.roleId,
    };
  };


  public addVideo = async (
    data: any,
  ): Promise<any> => {
    const { video, roleId, userId, videoKey } = data;
    const roleInfo = await roleData.findOne({
      where: {
        userId: userId
      }
    })
    if (!roleInfo) {
      throw new Error("Profiel bestaat niet.")
    }
    const userinfo = await users.findByPk(userId)
    if (!userinfo) {
      throw new Error("Gebruiker bestaat niet.")
    }
    roleInfo.video = video;
    roleInfo.videoKey = videoKey;
    roleInfo.isVideoSubmitted = true;
    await roleInfo.save()
    userinfo.profileStatus = 2
    await userinfo.save()
    // await users.update({ profileStatus: 2 }, { where: { id: userId } })
    await userLog.create({ userId: userId, isVideoSubmitted: true, videoSubmittedOn: new Date() })


    const name = roleInfo?.companyName ? roleInfo?.companyName : `${roleInfo?.firstName} ${roleInfo?.lastName}`

    const emailHtml = getProcessedTemplate("waiting_for_approval", { username: name });
    const isEmailSend: any = await sendEmail({
      from: String(process.env.EMAIL),
      to: userinfo.email,
      subject: "Profiel is ter beoordeling ingediend.",
      html: emailHtml,
    });

    if (!isEmailSend) {
      throw new Error("Fout bij het verzenden van e-mail.");
    }

    return {
      userId, roleId,
    }
  }

  public addEmployee = async (
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    const { userId, email, password } = data;
    const isSameEmailUserExist: any = await users.findOne({ where: { email } });
    if (isSameEmailUserExist) {
      throw new Error("E-mailadres is al in gebruik.");
    }

    const isUserExist: any = await users.findOne({
      where: { id: userId }, include: [
        {
          as: "roleData",
          model: roleData,
          attributes: ["companyName"]
        }
      ]
    });
    if (!isUserExist) {
      throw new Error("Gebruiker bestaat niet");
    }
    const isEmployeeExist: any = await employee.findOne({ where: { email } });
    if (isEmployeeExist) {
      throw new Error("Werknemer bestaat al");
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const isCreate: any = await employee.create({
      ...data,
      password: hashedPassword,
      // isApproved: false,
      profileStatus: 2,
    });
    if (!isCreate) {
      throw new Error("Fout bij het aanmaken van een werknemer.");
    }

    const empCount = await employee.count({ where: { userId } })
    if (empCount == 1) {
      await users.update({ profileStatus: 2 }, { where: { id: userId } })
    }

    let obj: any = {
      employeeId: isCreate.id,
      Status: "pending",
      StatusKey: 3,
      content: `${data.firstName} ${data.lastName} (Employee) wants to join the app and is requesting ID approval`,
      seen: 0,
      typeId: 2, //company notification
    };
    await userNotification.create({ ...obj }, { transaction });

    const emailHtml = getProcessedTemplate("employee_add", { employee_username: `${data.firstName} ${data.lastName}`, password: password, email: email, company_name: isUserExist.roleData.companyName });

    const isEmailSend: any = await sendEmail({
      from: String(process.env.EMAIL),
      to: email,
      subject: 'Toegevoegd als medewerker.',
      html: emailHtml, // Use processed HTML
    });

    if (!isEmailSend) {
      throw new Error("Fout bij het verzenden van een e-mail.")
    }
    return;
  };

  public getAllEmployeeByCompanyId = async (data: any): Promise<any> => {
    const { id } = data;
    const emmployeeData: any = await employee.findAndCountAll({
      where: { userId: id, deletedAt: null },
      order: [["createdAt", "desc"]],
      attributes: {
        exclude: ["password", "deletedAt"],
      },
    });

    return emmployeeData;
  };

  public getUserById = async (data: any): Promise<any> => {
    const { userId, typeId, employeeId } = data;
    //company
    if (typeId == 1) {
      const res: any = await roleData.findOne({
        where: { userId, deletedAt: null },
      });
      if (!res) return;

      const userObject = res.get({ plain: true });

      const filteredUser = Object.fromEntries(
        Object.entries(userObject).filter(([_, value]) => value !== null)
      );

      return filteredUser;
    }

    //employee
    if (typeId == 2) {
      if (!employeeId) {
        throw new Error("Medewerkers-ID ontbreekt.");
      }
      const res: any = await employee.findOne({
        where: { id: employeeId, userId, deletedAt: null },
        attributes: {
          exclude: ["password", "deledtedAt"],
        },
      });
      return res;
    }
  };

  public addIndustry = async (): Promise<any> => {
    const industries: any = [
      { id: "1", title: "Utilities installation" },
      { id: "2", title: "Building finishing contractors" },
      { id: "3", title: "Construction equipment contractors" },
      { id: "4", title: "Building contractors" },
      { id: "5", title: "Specialty trade contractors" },
      { id: "6", title: "Natural gas distribution" },
      { id: "7", title: "Natural gas extraction" },
      { id: "8", title: "Accommodation services" },
      { id: "9", title: "Justice administration" },
      { id: "10", title: "Government administration" },
      { id: "11", title: "Education administration programs" },
      { id: "12", title: "Administrative and support services" },
      { id: "13", title: "Legal services" },
      { id: "14", title: "Waste collection" },
      { id: "15", title: "Waste treatment and disposal" },
      { id: "16", title: "Alternative medicine" },
      { id: "17", title: "Ambulance services" },
      { id: "18", title: "Animation & post-production" },
      { id: "19", title: "Architecture & urban planning" },
      { id: "20", title: "Physicians" },
      { id: "21", title: "Banking" },
      { id: "22", title: "Bars, cafes, and nightclubs" },
      { id: "23", title: "Primary and secondary education" },
      { id: "24", title: "Bed and breakfasts, hostels, homestays" },
      { id: "25", title: "Business consulting and services" },
      { id: "26", title: "Corporate content" },
      { id: "27", title: "Investment advice" },
      { id: "28", title: "Vocational rehabilitation" },
      { id: "29", title: "Fire protection" },
      { id: "30", title: "Security and investigation services" },
      { id: "31", title: "Security services and patrol services" },
      { id: "32", title: "Libraries" },
      { id: "33", title: "Biotechnological research" },
      { id: "34", title: "Blockchain services" },
      { id: "35", title: "Blogs" },
      { id: "36", title: "Forestry and logging" },
      { id: "37", title: "Construction" },
      { id: "38", title: "Building construction" },
      { id: "39", title: "Breweries" },
      { id: "40", title: "Business intelligence platforms" },
      { id: "41", title: "Catering" },
      { id: "42", title: "Family planning centers" },
      { id: "43", title: "Chemical and agricultural production" },
      { id: "44", title: "Chemical manufacturing" },
      { id: "45", title: "Chiropractors" },
      { id: "46", title: "Circuses and magic shows" },
      { id: "47", title: "Civil and social organizations" },
      { id: "48", title: "Civil engineering" },
      { id: "49", title: "Computer and network security" },
      { id: "50", title: "Computer games" },
      { id: "51", title: "Conflict resolution" },
      { id: "52", title: "Consulting outsourcing and offshoring" },
      { id: "53", title: "Cosmetology and barber schools" },
      { id: "54", title: "Dance companies" },
      { id: "55", title: "Think tanks" },
      { id: "56", title: "Design services" },
      { id: "57", title: "Retail" },
      { id: "58", title: "Gasoline stations" },
      { id: "59", title: "Book and magazine retail" },
      { id: "60", title: "Building material and garden equipment retail" },
      { id: "61", title: "Creative tools retail" },
      { id: "62", title: "Health and personal care product retail" },
      {
        id: "63",
        title: "Household appliance and consumer electronics retail",
      },
      { id: "64", title: "Office supplies and gift retail" },
      { id: "65", title: "Clothing and fashion retail" },
      { id: "66", title: "Grocery retail" },
      { id: "67", title: "Food and beverage retail" },
      { id: "68", title: "Luxury goods and jewelry retail" },
      { id: "69", title: "Furniture and interior retail" },
      { id: "70", title: "Motor vehicle retail" },
      { id: "71", title: "Musical instrument retail" },
      { id: "72", title: "Online and mail-order retail" },
      { id: "73", title: "Recyclable materials and second-hand items retail" },
      { id: "74", title: "Security systems services" },
      { id: "75", title: "Veterinary services" },
      { id: "76", title: "Government relations services" },
      { id: "77", title: "Human resources services" },
      { id: "78", title: "Personal care services" },
      { id: "79", title: "Landscaping services" },
      { id: "80", title: "Senior and disabled services" },
      {
        id: "81",
        title:
          "Water supply, waste management, steam and air conditioning services",
      },
      { id: "82", title: "Zoos and botanical gardens" },
      { id: "83", title: "Animal feed production" },
      { id: "84", title: "Animal care" },
      { id: "85", title: "Private equity and venture capital" },
      { id: "86", title: "Distilleries" },
      { id: "87", title: "Wireless services" },
      { id: "88", title: "Printing companies" },
      { id: "89", title: "Economic programs" },
      { id: "90", title: "Securities and commodities exchanges" },
      { id: "91", title: "E-learning training" },
      {
        id: "92",
        title: "Electricity transmission, control, and distribution",
      },
      { id: "93", title: "Electric power generation" },
      { id: "94", title: "Embedded software products" },
      { id: "95", title: "Renewable energy generation" },
      { id: "96", title: "Entertainment providers" },
      {
        id: "97",
        title: "Ergonomists, physiotherapists, and speech therapists",
      },
      { id: "98", title: "Event services" },
      { id: "99", title: "Facility services" },
      { id: "100", title: "Pharmaceutical manufacturing" },
      { id: "101", title: "Philanthropic fundraising services" },
      { id: "102", title: "Film and sound recording" },
      { id: "103", title: "Films, videos, and sound" },
      { id: "104", title: "Financial administration" },
      { id: "105", title: "Financial services" },
      { id: "106", title: "Funds and trusts" },
      { id: "107", title: "Fundraising" },
      { id: "108", title: "Photography" },
      { id: "109", title: "Fruit and vegetable canning production" },
      { id: "110", title: "Mental healthcare" },
      { id: "111", title: "Fabricated metal products" },
      { id: "112", title: "Data infrastructure and analysis" },
      { id: "113", title: "Sound recording" },
      { id: "114", title: "Medicine" },
      { id: "115", title: "Health services" },
      { id: "116", title: "Gambling halls and casinos" },
      { id: "117", title: "Golf courses and country clubs" },
      { id: "118", title: "Graphic design" },
      { id: "119", title: "Wholesale" },
      { id: "120", title: "Wholesale alcoholic beverages" },
      { id: "121", title: "Wholesale equipment, electricity, and electronics" },
      { id: "122", title: "Wholesale building materials" },
      { id: "123", title: "Wholesale chemical and related products" },
      { id: "124", title: "Wholesale computer equipment" },
      { id: "125", title: "Wholesale photography equipment and products" },
      { id: "126", title: "Wholesale hardware, piping, heating equipment" },
      { id: "127", title: "Wholesale import and export" },
      { id: "128", title: "Wholesale machinery" },
      { id: "129", title: "Wholesale drugs and health products" },
      { id: "130", title: "Wholesale paper products" },
      { id: "131", title: "Wholesale shoes" },
      { id: "132", title: "Wholesale clothing and sewing supplies" },
      { id: "133", title: "Wholesale agricultural products" },
      { id: "134", title: "Wholesale food and beverage" },
      { id: "135", title: "Wholesale luxury goods and jewelry" },
      { id: "136", title: "Wholesale metals and minerals" },
      { id: "137", title: "Wholesale petroleum and petroleum products" },
      { id: "138", title: "Wholesale recyclable materials" },
      { id: "139", title: "Historical sites" },
      { id: "140", title: "Higher education" },
      { id: "141", title: "Holding companies" },
      { id: "142", title: "Hospitality and tourism" },
      { id: "143", title: "Hotels and motels" },
      { id: "144", title: "Pet services" },
      { id: "145", title: "Household services" },
      { id: "146", title: "Housing and community development" },
      { id: "147", title: "Housing programs" },
      { id: "148", title: "ICT and design services" },
      { id: "149", title: "Custom software development" },
      { id: "150", title: "ICT services and consultancy" },
      { id: "151", title: "ICT system testing and evaluation" },
      { id: "152", title: "ICT system training and support" },
      { id: "153", title: "Collection services" },
      { id: "154", title: "Internet media" },
      { id: "155", title: "Information services" },
      { id: "156", title: "Installation and removal of ICT systems" },
      { id: "157", title: "Interior design" },
      { id: "158", title: "International relations and diplomatic service" },
      { id: "159", title: "International trade and development" },
      { id: "160", title: "Internet news" },
      { id: "161", title: "Interurban and suburban bus transit" },
      { id: "162", title: "Investment advice" },
      { id: "163", title: "Investment banking" },
      { id: "164", title: "Cable and satellite programs" },
      { id: "165", title: "Office management" },
      { id: "166", title: "Capital markets" },
      { id: "167", title: "Daycare centers" },
      { id: "168", title: "Customer service" },
      { id: "169", title: "Clothing industry" },
      { id: "170", title: "Newspaper industry" },
      { id: "171", title: "Credit mediation" },
      { id: "172", title: "Credit brokers" },
      { id: "173", title: "Armed forces" },
      { id: "174", title: "Art academy" },
      { id: "175", title: "Artists and writers" },
      { id: "176", title: "Art dealers (retail)" },
      { id: "177", title: "Paint, coating, and adhesive manufacturing" },
      { id: "178", title: "Agriculture" },
      { id: "179", title: "Agriculture, forestry, fishing" },
      { id: "180", title: "Commercial real estate leasing" },
      { id: "181", title: "Residential real estate leasing" },
      { id: "182", title: "Leather goods manufacturing" },
      { id: "183", title: "Food and beverage industry" },
      { id: "184", title: "Airlines and aviation" },
      { id: "185", title: "Social development and urban planning" },
      { id: "186", title: "Machinery manufacturing" },
      { id: "187", title: "Real estate brokers" },
      { id: "188", title: "Marketing services" },
      { id: "189", title: "Market research" },
      { id: "190", title: "Media and telecommunications" },
      { id: "191", title: "Media production" },
      { id: "192", title: "Medical and research laboratories" },
      { id: "193", title: "Metalworking" },
      { id: "194", title: "Metal mining" },
      { id: "195", title: "Metal valve, shaft, and rail production" },
      { id: "196", title: "Furniture upholstery and repair" },
      { id: "197", title: "Mining" },
      { id: "198", title: "Non-metallic mineral mining" },
      { id: "199", title: "Mining, oil and gas extraction" },
      { id: "200", title: "Environmental protection programs" },
      { id: "201", title: "Environmental services" },
      { id: "202", title: "Environmental programs" },
      { id: "203", title: "Military and international relations" },
      { id: "204", title: "Mobile gaming apps" },
      { id: "205", title: "Mobile food services" },
      { id: "206", title: "Museums, historical sites, and zoos" },
      { id: "207", title: "Musicians" },
      { id: "208", title: "Management support" },
      { id: "209", title: "Nanotechnological research" },
      { id: "210", title: "Non-residential construction" },
      { id: "211", title: "Non-profit organizations" },
      { id: "212", title: "Emergency and other emergency services" },
      { id: "213", title: "Utilities" },
      { id: "214", title: "Natural resource management" },
      { id: "215", title: "Oil and gas extraction" },
      { id: "216", title: "Oil and coal production" },
      { id: "217", title: "Oil drilling" },
      { id: "218", title: "Broadcasting and distribution" },
      { id: "219", title: "Commercial and industrial equipment maintenance" },
      { id: "220", title: "Maintenance of electronic or precision equipment" },
      { id: "221", title: "Education" },
      { id: "222", title: "Research services" },
      { id: "223", title: "Online audio and video media" },
      { id: "224", title: "Public administration offices" },
      { id: "225", title: "Public safety" },
      { id: "226", title: "Operations consulting" },
      { id: "227", title: "Optometrists" },
      { id: "228", title: "Biomass generation" },
      { id: "229", title: "Fossil fuel generation" },
      { id: "230", title: "Geothermal energy generation" },
      { id: "231", title: "Nuclear energy generation" },
      { id: "232", title: "Wind energy generation" },
      { id: "233", title: "Solar energy generation" },
      { id: "234", title: "Paper and forestry" },
      { id: "235", title: "Prisons" },
      { id: "236", title: "Pension funds" },
      { id: "237", title: "Personal and laundry services" },
      { id: "238", title: "Pipeline transportation" },
      { id: "239", title: "Internet marketplace platforms" },
      { id: "240", title: "Performing arts" },
      { id: "241", title: "Outpatient care centers" },
      { id: "242", title: "Police and justice" },
      { id: "243", title: "Political organizations" },
      { id: "244", title: "Postal services" },
      { id: "245", title: "Amusement parks and arcades" },
      { id: "246", title: "Primary metal production" },
      { id: "247", title: "Automation machinery manufacturing" },
      { id: "248", title: "Tableware and hand tool manufacturing" },
      { id: "249", title: "Chemical raw material production" },
      { id: "250", title: "Communication equipment manufacturing" },
      { id: "251", title: "Defense and aerospace manufacturing" },
      { id: "252", title: "Electrical appliance manufacturing" },
      { id: "253", title: "Semiconductor lighting manufacturing" },
      { id: "254", title: "Glass, ceramic, and concrete manufacturing" },
      { id: "255", title: "Semiconductor manufacturing" },
      {
        id: "256",
        title: "Semiconductor manufacturing for sustainable energy",
      },
      { id: "257", title: "Household appliance manufacturing" },
      {
        id: "258",
        title: "Household appliance and consumer electronics manufacturing",
      },
      { id: "259", title: "Industrial machinery manufacturing" },
      {
        id: "260",
        title: "Artificial rubber and synthetic fiber manufacturing",
      },
      { id: "261", title: "Magnetic and optical media manufacturing" },
      { id: "262", title: "Mattress and blinds manufacturing" },
      { id: "263", title: "Medical equipment manufacturing" },
      { id: "264", title: "Metalworking machinery manufacturing" },
      { id: "265", title: "Motor vehicle parts manufacturing" },
      { id: "266", title: "Motor vehicle manufacturing" },
      { id: "267", title: "Plastic and rubber manufacturing" },
      { id: "268", title: "Personal care and hygiene product manufacturing" },
      { id: "269", title: "Abrasives and non-metallic mineral manufacturing" },
      { id: "270", title: "Renewable energy equipment manufacturing" },
      { id: "271", title: "Computer and electronic device manufacturing" },
      { id: "272", title: "Clay and refractory product manufacturing" },
      {
        id: "273",
        title: "Commercial and service industry machinery manufacturing",
      },
      { id: "274", title: "Measuring and control equipment manufacturing" },
      { id: "275", title: "Office furniture and equipment manufacturing" },
      {
        id: "276",
        title: "Residential furniture and furnishings manufacturing",
      },
      { id: "277", title: "Fashion accessories manufacturing" },
      { id: "278", title: "Aerospace and motor vehicle parts manufacturing" },
      { id: "279", title: "Sports and fitness equipment manufacturing" },
      { id: "280", title: "Packaging and container manufacturing" },
      { id: "281", title: "Video and audio equipment manufacturing" },
      { id: "282", title: "Soap and cleaning agent manufacturing" },
      { id: "283", title: "Dairy product manufacturing" },
      { id: "284", title: "Heating and cooling equipment manufacturing" },
      { id: "285", title: "Professional organizations" },
      { id: "286", title: "Professional services" },
      { id: "287", title: "Professional training and coaching" },
      { id: "288", title: "Air, water, and waste program management" },
      { id: "289", title: "Public relations and communication services" },
      { id: "290", title: "Public services" },
      { id: "291", title: "Program management" },
      { id: "292", title: "Racetracks" },
      { id: "293", title: "Radio and TV broadcasts" },
      { id: "294", title: "Courts" },
      { id: "295", title: "Advertising and advertisers services" },
      { id: "296", title: "Recreation facilities" },
      { id: "297", title: "Travel industry" },
      { id: "298", title: "Religious institutions" },
      { id: "299", title: "Repair and maintenance" },
      { id: "300", title: "Residential construction" },
      { id: "301", title: "Restaurants" },
      { id: "302", title: "Aerospace research and technology" },
      { id: "303", title: "Compensation claims and actuarial services" },
      { id: "304", title: "Shipbuilding" },
      { id: "305", title: "Shoe and leather goods repair" },
      { id: "306", title: "Shoe manufacturing" },
      { id: "307", title: "School and employee bus services" },
      { id: "308", title: "Cleaning services" },
      { id: "309", title: "Writing and editing" },
      { id: "310", title: "Secretary training" },
      { id: "311", title: "Strategic management services" },
      { id: "312", title: "Renewable energy services" },
      { id: "313", title: "Shuttles and specialized transport services" },
      { id: "314", title: "Ski facilities" },
      { id: "315", title: "Social network platforms" },
      { id: "316", title: "Software development" },
      { id: "317", title: "Data security software products" },
      { id: "318", title: "Desktop software products" },
      { id: "319", title: "Mobile computer software products" },
      { id: "320", title: "Savings institutions" },
      { id: "321", title: "Railway transportation" },
      { id: "322", title: "Sports and recreation lessons" },
      { id: "323", title: "Sports teams and clubs" },
      { id: "324", title: "City transportation services" },
      { id: "325", title: "Coal mining" },
      { id: "326", title: "Vocational education student" },
      { id: "327", title: "Undergraduate student" },
      { id: "328", title: "Graduate student" },
      { id: "329", title: "Language schools" },
      { id: "330", title: "Tobacco production" },
      { id: "331", title: "Dentists" },
      { id: "332", title: "Taxi and limousine services" },
      { id: "333", title: "Technical services" },
      { id: "334", title: "Technical and vocational training" },
      { id: "335", title: "Technology, information, and media" },
      { id: "336", title: "Telecommunication providers" },
      { id: "337", title: "Telecommunications" },
      { id: "338", title: "Satellite telecommunications" },
      { id: "339", title: "Textile manufacturing" },
      { id: "340", title: "Theater companies" },
      { id: "341", title: "Home care" },
      { id: "342", title: "Temporary aid services" },
      { id: "343", title: "Magazine industry" },
      { id: "344", title: "Tourist transportation" },
      { id: "345", title: "Transport, logistics, supply chain, and storage" },
      { id: "346", title: "Trusts and estates" },
      { id: "347", title: "Horticulture" },
      { id: "348", title: "Book and magazine publishers" },
      { id: "349", title: "Sheet music publishers" },
      { id: "350", title: "Executive authorities" },
      { id: "351", title: "Performing arts and spectator sports" },
      { id: "352", title: "Livestock farming" },
      { id: "353", title: "Livestock and fisheries" },
      { id: "354", title: "Consumer goods rental" },
      { id: "355", title: "Commercial and industrial equipment rental" },
      { id: "356", title: "Equipment rental services" },
      { id: "357", title: "Nursing homes and assisted living facilities" },
      { id: "358", title: "Translations and localization" },
      { id: "359", title: "Transportation programs" },
      { id: "360", title: "Insurers" },
      { id: "361", title: "Insurance" },
      { id: "362", title: "Insurance and secondary personnel benefits" },
      { id: "363", title: "Insurance companies and intermediaries" },
      { id: "364", title: "Fish products" },
      { id: "365", title: "Fisheries" },
      { id: "366", title: "Flight training" },
      { id: "367", title: "Vehicle repair and maintenance" },
      { id: "368", title: "Public health" },
      { id: "369", title: "Steam and air conditioning supply" },
      { id: "370", title: "Freight and parcel transportation" },
      { id: "371", title: "Truck transportation" },
      { id: "372", title: "Department stores and storage" },
      { id: "373", title: "Laundromats and dry cleaners" },
      { id: "374", title: "Water supply and irrigation systems" },
      { id: "375", title: "Road, street, and bridge construction" },
      { id: "376", title: "Wellness and fitness services" },
      { id: "377", title: "Operation and maintenance of IT systems" },
      { id: "378", title: "Legislative authorities" },
      { id: "379", title: "Wineries" },
      { id: "380", title: "Web & App design" },
      { id: "381", title: "Marine transportation" },
      { id: "382", title: "Hospitals" },
      { id: "383", title: "Hospitals and healthcare" },
      { id: "384", title: "Executive search services" },
    ];
    industries.sort((a: any, b: any) => a.title.localeCompare(b.title));

    for (const item of industries) {
      const categoryName = item.title[0]; // Assumes the title starts with the category letter
      await industry.create({
        categoryName: categoryName.toUpperCase(), // Ensures the category name is uppercase
        serviceName: item.title,
      });
    }
  };

  public getIndustryList = async (): Promise<any> => {
    const results: any = await industry.findAll({});
    const groupedByCategory = results.reduce(
      (accumulator: any, current: any) => {
        if (!accumulator[current.categoryName]) {
          accumulator[current.categoryName] = [];
        }
        accumulator[current.categoryName].push({
          id: current.id,
          name: current.serviceName,
        });
        return accumulator;
      },
      {}
    );

    return groupedByCategory;
  };

  public getLanguageList = async (): Promise<any> => {
    return languages;
  };

  public getProfile = async (data: any): Promise<any> => {
    const { userId, roleId } = data;
    let columns: any[] = [];
    let isUser: any;
    if (roleId != 3) {
      isUser = await users.findOne({
        where: { id: userId }, attributes: [[
          Sequelize.literal(`(
              SELECT CASE 
                WHEN COUNT(*) > 0 THEN true 
                ELSE false 
              END 
              FROM \`like\` 
              WHERE \`like\`.toLikeId = users.id
            )`),
          "profileLike",
        ]], raw: true
      });
    } else {
      isUser = await employee.findOne({
        where: { id: userId }, attributes: [[
          Sequelize.literal(`(
            SELECT CASE 
              WHEN COUNT(*) > 0 THEN true 
              ELSE false 
            END 
            FROM \`like\` 
            WHERE \`like\`.toLikeId = employee.id
          )`),
          "profileLike",
        ]], raw: true
      });
    }
    console.log("isUser", isUser);

    if (isUser) {
      switch (roleId) {
        case 1:
          columns = [
            "firstName",
            "lastName",
            "title",
            "genderId",
            "dob",
            "address",
            "educationalAttainmentId",
            "currentSituationId",
            "languageId",
            "industryId",
            "about",
            "profile",
            "createdAt",
            "age",
            "hourlyRate",
            "accountStatus",
            "isVideoSubmitted",
            "mutedDays",
            "suspendedDays",
            "suspendedOn",
            "suspendReason",
            "muteReason",
            "mutedOn",
            "chamberCommerceNumber",

          ];
          break;
        case 2:
          columns = [
            "profile",
            "companyName",
            "about",
            "streetName",
            "houseName",
            "city",
            "province",
            "postalCode",
            "chamberCommerceNumber",
            "website",
            "industryId",
            "createdAt",
            "accountStatus",
            "isVideoSubmitted",
            "mutedDays",
            "suspendedDays",
            "suspendedOn",
            "mutedOn",
            "suspendReason",
            "muteReason",

          ];
          break;
        case 3:
          // columns = ["companyName", "about"];
          const employeeData: any = await employee.findOne({
            where: { id: userId },
            attributes: [
              "id",
              "userId",
              "firstName",
              "lastName",
              "currentSituationId",
              "currentSituationName",
              "email",
              "phone",
              "suspendReason",
              "muteReason",
              [Sequelize.literal("3"), "roleId"],


            ],
            raw: true
          });

          const roleRes = await roleData.findOne({
            where: { userId: employeeData.userId },
            attributes: ["profile",
              "userId",
              "companyName",
              "about",
              "streetName",
              "houseName",
              "city",
              "province",
              "postalCode",
              "chamberCommerceNumber",
              "website",
              "industryId",
              "createdAt",
              "accountStatus",
              "isVideoSubmitted",
              "mutedDays",
              "suspendedDays",
              "suspendReason",
              "muteReason",
              "suspendedOn",
              "mutedOn",
              [
                Sequelize.literal(`(
                              SELECT CASE 
                                WHEN COUNT(*) > 0 THEN true 
                                ELSE false 
                              END 
                              FROM \`like\` 
                              WHERE \`like\`.toLikeId = roleData.userId
                            )`),
                "profileLike",
              ],

            ], raw: true
          });

          return {
            id: employeeData.id,
            userId: employeeData.userId,
            firstName: employeeData.firstName,
            lastName: employeeData.lastName,
            currentSituationId: employeeData.currentSituationId,
            currentSituationName: employeeData.currentSituationName,
            email: employeeData.email,
            phone: employeeData.phone,
            roleId: 3,
            companyData: {
              ...roleRes,
              id: employeeData.userId,
              roleId: 2
            }
          };
      }

      const roleRes = await roleData.findOne({
        where: { userId: userId },
        attributes: columns,
      });
      return { userId: userId, roleId: roleId, profileLike: isUser.profileLike, roleData: roleRes };
    } else {
      throw new Error("Gebruiker niet gevonden.");
    }
  };

  public uploadFile = async (body: any) => {
    const { file, type } = body;

    console.log("here body", { file, type });

    AWS.config.update({
      accessKeyId: process.env.A_ACCESS_KEY_ID,
      secretAccessKey: process.env.A_SECRET_ACCESS_KEY,
    });

    const BUCKET_NAME = `${process.env.FILE_UPLOAD_BUCKET_NAME}`;
    const s3 = new AWS.S3();

    // Determine whether it's an image or video
    let fileBuffer: Buffer;
    let contentType: string;
    let fileExtension: string;
    let maxFileSizeInBytes: number;

    if (type === "image") {
      // Image handling
      fileBuffer = Buffer.from(file.split(",")[1], "base64");
      contentType = "image/jpeg"; // Adjust based on image format (e.g., image/png)
      fileExtension = "jpg"; // Adjust based on file format (e.g., png, jpeg)
      maxFileSizeInBytes = 4194304; // 4MB size limit for images
    } else if (type === "video") {
      // Video handling
      fileBuffer = Buffer.from(file.split(",")[1], "base64");
      contentType = "video/mp4"; // Adjust based on video format (e.g., video/avi, video/mov)
      fileExtension = "mp4"; // Adjust based on file format
      maxFileSizeInBytes = 104857600; // 100MB size limit for videos
    } else {
      throw new Error("Ongeldig bestandstype. Alleen afbeeldingen of video's worden ondersteund.");
    }

    // Check if the file size exceeds the limit
    const fileSizeInBytes = fileBuffer.length;
    if (fileSizeInBytes > maxFileSizeInBytes) {
      throw new Error(`${type.charAt(0).toUpperCase() + type.slice(1)} de grootte overschrijdt de limiet van
 ${maxFileSizeInBytes / (1024 * 1024)}MB`);
    }

    const randomID = parseInt(`${Math.random() * 10000000}`);
    const key = `${randomID}.${fileExtension}`; // Dynamic key with correct file extension

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    };

    console.log("🚀 ~ uploadResource= ~ params:", params);
    const uploadResult = await s3.upload(params).promise();

    if (!uploadResult) {
      throw new Error(`Fout bij uploaden ${type} to S3`);
    }

    return {
      awsKey: uploadResult.Key,
      awsUrl: uploadResult.Location,
    };
  };

  public editProfile = async (
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    const { userId, roleId } = data;
    let info: any;
    let isUser: any;
    let name: any;
    let roleName: any;

    let dupColName: any = roleId != 3 ? "userId" : "employeeId";
    const isDupDataExist: any = await duplicateData.findOne({
      where: { [dupColName]: userId }, transaction
    });

    if (roleId != 3) {
      isUser = await users.findOne({
        where: { id: userId }, transaction, include: [

          {
            as: 'roleData',
            model: roleData,
            attributes: ["id", "firstName", "lastName", "companyName"]
          }
        ]
      });
    } else {
      isUser = await employee.findOne({ where: { id: userId }, transaction });
    }

    if (isUser) {
      switch (roleId) {
        case 1:
          if (
            data.title ||
            data.genderId ||
            data.educationalAttainmentId ||
            data.about ||
            data.address ||
            data.city ||
            data.languageId ||
            data.industryId ||
            data.industryName ||
            data.address || data.currentSituationId || data.hourlyRate || data.chamberCommerceNumber || data.firstName || data.lastName || data.dob || data.profile
          ) {
            info = {
              title: data.title,
              genderId: data.genderId,
              dob: data.dob,
              address: data.address,
              educationalAttainmentId: data.educationalAttainmentId,
              languageId: data.languageId,
              industryId: data.industryId,
              industryName: data.industryName,
              about: data.about,
              currentSituationId: data.currentSituationId,
              hourlyRate: data.hourlyRate,
              chamberCommerceNumber: data.chamberCommerceNumber,
              firstName: data.firstName,
              lastName: data.lastName,
              profile: data.profile,
              city: data.city,
            };
          }

          if (data.accountStatus) {
            await roleData.update(
              { accountStatus: data.accountStatus },
              { where: { userId }, transaction }
            );
          }
          roleName = "Freeelancer";
          name = `${isUser.roleData?.firstName} ${isUser.roleData?.lastName}`;
          break;
        case 2:
          if (data.about ||
            data.companyName ||
            data.streetName ||
            data.houseName ||
            data.province ||
            data.postalCode ||
            data.city ||
            data.chamberCommerceNumber ||
            data.website ||
            data.industryId ||
            data.industryName ||
            data.currentSituationId || data.hourlyRate || data.title || data.firstName || data.lastName || data.dob || data.profile

          ) {
            info = {
              companyName: data.companyName, about: data.about, streetName: data.streetName, houseName: data.houseName, province: data.province, postalCode: data.postalCode, chamberCommerceNumber: data.chamberCommerceNumber,
              website: data.website, city: data.city, industryId: data.industryId, industryName: data.industryName, currentSituationId: data.currentSituationId, hourlyRate: data.hourlyRate, title: data.title, firstName: data.firstName, lastName: data.lastName, dob: data.dob, profile: data.profile,

            };
          }

          if (data.accountStatus) {
            await roleData.update(
              { accountStatus: data.accountStatus },
              { where: { userId }, transaction }
            );
          }
          name = `${isUser.roleData?.companyName}`;
          roleName = "Company";

          break;
        case 3:
          if (data.firstName || data.lastName || data.email || data.phone || data.profile || data.currentSituationName) {
            info = {
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              phone: data.phone,
              profile: data.profile,
              currentSituationName: data.currentSituationName,
            };
          }
          if (data.accountStatus || data.currentSituationId) {
            await employee.update(
              {
                accountStatus: data.accountStatus,
                // currentSituationId: data.currentSituationId,
                // currentSituationName: data.currentSituationName,
              },
              { where: { id: userId }, transaction }
            );
          }

          name = `${isUser.firstName} ${isUser.lastName} `;
          roleName = "Employee";

          break;
      }

      // await roleData.update(info, {
      //   where: { userId: userId },
      // });
    } else {
      throw new Error("Gebruiker niet gevonden.");
    }

    if (info) {
      if (isDupDataExist) {
        throw new Error("Uw updateverzoek is al in behandeling.");
      }
      const colName = roleId == 3 ? "employeeId" : "userId";
      await duplicateData.create(
        { ...info, [colName]: isUser?.id },
        { transaction }
      );

      if (roleId === 3) {
        await employee.update({ profileStatus: 7 }, { where: { id: userId }, transaction });
      } else {
        await users.update({ profileStatus: 7 }, { where: { id: userId }, transaction });
      }


      let obj: any = {
        [colName]: isUser?.id,
        Status: "pending",
        StatusKey: 3,
        content: `${name} (${roleName}) is requesting an info update`,
        seen: 0,
        typeId: 4, //update Info notification
      };
      await userNotification.create({ ...obj }, { transaction });
    }
  };

  public updatePassword = async (data: any): Promise<any> => {
    const { userId, roleId, currentPass, newPass, confirmPass } = data;
    let isUser: any;
    let isMatched: any;
    let userUpdate: any;

    if (roleId != 3) {
      isUser = await users.findOne({ where: { id: userId, roleId } });
      if (!isUser) {
        throw new Error("Gebruiker bestaat niet.");
      }
      isMatched = await bcrypt.compare(currentPass, isUser?.password);
    } else {
      isUser = await employee.findOne({ where: { id: userId } });
      if (!isUser) {
        throw new Error("Gebruiker bestaat niet.");
      }
      isMatched = await bcrypt.compare(currentPass, isUser?.password);
    }
    if (!isMatched) {
      throw new Error("Het huidige wachtwoord is ongeldig.");
    }
    if (newPass != confirmPass) {
      throw new Error("De velden Wachtwoord en Bevestig wachtwoord moeten hetzelfde zijn.");
    }
    const hashedPassword = await bcrypt.hash(newPass, 10);
    if (roleId !== 3) {
      userUpdate = await users.update(
        { password: hashedPassword },
        { where: { id: userId } }
      );
    } else {
      userUpdate = await employee.update(
        { password: hashedPassword },
        { where: { id: userId } }
      );
    }
    if (!userUpdate) {
      throw new Error("Fout bij het bijwerken van het wachtwoord.");
    }
  };

  // public getUserLikedProfile = async (data: any): Promise<any> => {
  //   const { userId, roleId } = data;
  //   let colName: any = roleId == 3 ? "employeeWhoLikeId" : "userWhoLikeId";

  //   const result: any = await like.findAndCountAll({
  //     where: { [colName]: userId, roleId: roleId },
  //     attributes: [],
  //     include: [
  //       {
  //         as: "toLikeUser",
  //         model: users,
  //         attributes: [
  //           "id",
  //           "roleId",
  //           "name",
  //           [
  //             Sequelize.literal(`(
  //                 SELECT CASE
  //                   WHEN COUNT(*) > 0 THEN true
  //                   ELSE false
  //                 END
  //                 FROM \`like\`
  //                 WHERE \`like\`.userWhoLikeId = ${userId} AND \`like\`.toLikeId = toLikeUser.id
  //               )`),
  //             "like",
  //           ],
  //         ],
  //         include: [
  //           {
  //             as: "roleData",
  //             model: roleData,
  //             attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
  //           },
  //         ],
  //       },
  //       {
  //         as: "toLikeEmp",
  //         model: employee,
  //         attributes: [
  //           "id",
  //           "roleId",
  //           "name",
  //           [
  //             Sequelize.literal(`(
  //                 SELECT CASE
  //                   WHEN COUNT(*) > 0 THEN true
  //                   ELSE false
  //                 END
  //                 FROM \`like\`
  //                 WHERE \`like\`.userWhoLikeId = ${userId} AND \`like\`.toLikeId = toLikeUser.id
  //               )`),
  //             "like",
  //           ],
  //         ],
  //         include: [
  //           {
  //             as: "roleData",
  //             model: roleData,
  //             attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
  //           },
  //         ],
  //       },
  //     ],
  //   });

  //   // Function to filter out null fields
  //   const filterNullValues = (obj: any) => {
  //     return Object.fromEntries(
  //       Object.entries(obj).filter(([_, v]) => v != null)
  //     );
  //   };

  //   // Post-process the result to remove null fields in roleData and flatten the structure
  //   const filteredResult = result.rows.map((row: any) => {
  //     if (row.toLikeUser) {
  //       // Accessing raw `dataValues` to get the actual values
  //       const userData = row.toLikeUser.dataValues;
  //       const roleData = userData.roleData
  //         ? filterNullValues(userData.roleData.dataValues)
  //         : {};

  //       return {
  //         id: userData.id,
  //         roleId: userData.roleId,
  //         name: userData.name,
  //         like: userData.like,
  //         roleData: roleData,
  //       };
  //     }
  //     return {};
  //   });

  //   return {
  //     count: result.count,
  //     rows: filteredResult,
  //   };
  // };

  public getUserLikedProfile = async (data: any): Promise<any> => {
    const { userId, roleId } = data;

    // Determine the correct column to use based on roleId
    const whoLikeCol = roleId === 3 ? "employeeWhoLikeId" : "userWhoLikeId";

    const result: any = await like.findAndCountAll({
      where: { [whoLikeCol]: userId, roleId: roleId },
      attributes: [],
      include: [
        // Include user details if the liked person is a user
        {
          as: "toLikeUser",
          model: users,
          attributes: [
            "id",
            "roleId",
            "name",
            [
              Sequelize.literal(`(
                SELECT CASE 
                  WHEN COUNT(*) > 0 THEN true 
                  ELSE false 
                END 
                FROM \`like\` 
                WHERE (\`like\`.toLikeId = toLikeUser.id OR \`like\`.employeeToLikeId = toLikeUser.id)
              )`),
              "like", // Whether the user has liked this profile
            ],
            [
              Sequelize.literal(`(
                SELECT COUNT(*) 
                FROM \`like\` 
                WHERE (\`like\`.toLikeId = toLikeUser.id OR \`like\`.employeeToLikeId = toLikeUser.id)
              )`),
              "likeCount", // Total likes count for the user
            ],
          ],
          required: false,
          include: [
            {
              as: "roleData",
              model: roleData,
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            },
          ],
        },
        // Include employee details if the liked person is an employee
        {
          as: "toLikeEmp",
          model: employee,
          attributes: [
            "id",
            [Sequelize.literal("3"), "roleId"],
            "firstName",
            "lastName",
            [
              Sequelize.literal(`(
                SELECT CASE 
                  WHEN COUNT(*) > 0 THEN true 
                  ELSE false 
                END 
                FROM \`like\` 
                WHERE (\`like\`.toLikeId = toLikeEmp.id OR \`like\`.employeeToLikeId = toLikeEmp.id)
              )`),
              "like", // Whether the employee has liked this profile
            ],
            [
              Sequelize.literal(`(
                SELECT COUNT(*) 
                FROM \`like\` 
                WHERE (\`like\`.toLikeId = toLikeEmp.id OR \`like\`.employeeToLikeId = toLikeEmp.id)
              )`),
              "likeCount", // Total likes count for the employee
            ],
          ],
          required: false,
          include: [
            {
              as: "users",
              model: users,
              attributes: ["id", "roleId", "name"],
              include: [
                {
                  as: "roleData",
                  model: roleData,
                  attributes: {
                    exclude: ["createdAt", "updatedAt", "deletedAt"],
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    return result;
  };

  public getAppStatus = async (data: any): Promise<any> => {
  const { userId, roleId } = data;
  let employeeCount: any;

  // === CASE: EMPLOYEE ===
  if (roleId == 3) {
    const employeeData: any = await employee.findOne({
      where: { id: userId },
      raw: true,
    });

    if (!employeeData) {
      throw new Error("Employee not found");
    }

    const compData: any = await roleData.findOne({
      where: { userId: employeeData.userId },
      attributes: ["companyName", "chamberCommerceNumber"],
      raw: true,
    });

    // ✅ Fix: convert string → Date, then addDays
    const suspendUntil =
      employeeData.suspendedOn && employeeData.suspendedDays
        ? addDays(new Date(employeeData.suspendedOn), employeeData.suspendedDays)
        : null;

    const muteUntil =
      employeeData.mutedOn && employeeData.mutedDays
        ? addDays(new Date(employeeData.mutedOn), employeeData.mutedDays)
        : null;

    const response = {
      id: employeeData.id,
      name: employeeData.firstName + " " + employeeData.lastName,
      firstName: employeeData.firstName,
      lastName: employeeData.lastName,
      email: employeeData.email,
      profile: employeeData.profile,
      phone: employeeData.phone,
      currentSituationId: employeeData.currentSituationId,
      currentSituationName: employeeData.currentSituationName,
      isApproved: employeeData.isApproved,
      status: employeeData.profileStatus,
      firstTimeLogin: employeeData.firstTimeLogin,
      roleId: 3,
      roleData: {
        accountStatus: employeeData.accountStatus,
        mutedOn: employeeData.mutedOn,
        suspendedOn: employeeData.suspendedOn,
        suspendUntil,
        muteUntil,
      },
      companyData: {
        id: employeeData.userId,
        companyName: compData?.companyName || null,
        chamberCommerceNumber: compData?.chamberCommerceNumber || null,
        roleId: 2,
      },
    };
    return response;
  }

  // === CASE: COMPANY / FREELANCER / OTHERS ===
  const userData: any = await users.findOne({
    where: { id: userId },
    include: [
      {
        as: "roleData",
        model: roleData,
        attributes: { exclude: ["updatedAt", "deletedAt"] },
      },
    ],
  });

  if (!userData) {
    throw new Error("Gebruiker bestaat niet.");
  }

  if (userData && userData.roleData) {
    const cleanedRoleData = { ...userData.roleData.dataValues };
    Object.keys(cleanedRoleData).forEach((key) => {
      if (cleanedRoleData[key] === null) {
        delete cleanedRoleData[key];
      }
    });

    // ✅ Fix for non-employee users too
    const suspendUntil =
      cleanedRoleData.suspendedOn && cleanedRoleData.suspendedDays
        ? addDays(new Date(cleanedRoleData.suspendedOn), cleanedRoleData.suspendedDays)
        : null;

    const muteUntil =
      cleanedRoleData.mutedOn && cleanedRoleData.mutedDays
        ? addDays(new Date(cleanedRoleData.mutedOn), cleanedRoleData.mutedDays)
        : null;

    cleanedRoleData.suspendUntil = suspendUntil;
    cleanedRoleData.muteUntil = muteUntil;

    userData.roleData = cleanedRoleData;
  }

  if (userData.roleId == 2) {
    employeeCount = await employee.count({ where: { userId: userData.id } });
  }

  return {
    id: userData?.id,
    name: userData?.name,
    email: userData?.email,
    emailVerified: userData?.emailVerified,
    roleId: userData?.roleId,
    status: userData?.profileStatus,
    firstTimeLogin: userData?.firstTimeLogin,
    rejectionReason: userData?.rejectionReason,
    roleData: userData?.roleData,
    employeeCount,
  };
};




  public saveToken = async (data: any): Promise<any> => {
    const { token, userId, roleId } = data;
    if (roleId == 1 || roleId == 2) {
      await users.update(
        { fcmToken: token },
        { where: { id: userId, roleId } }
      );
    } else {
      await employee.update({ fcmToken: token }, { where: { id: userId } });
    }
  };

  public sendPushNotifications = async (data: any): Promise<any> => {
    const { sendBy, title, body, sendTo, isSendToAll, image } = data;
    console.log("image", image);

    let allFcmTokens: string[] = [];

    if (isSendToAll) {
      // Fetch all users and employee data when sending to all
      const UserData: any = await users.findAll({
        attributes: ["fcmToken"],
      });
      const employeeData: any = await employee.findAll({
        attributes: ["fcmToken"],
      });

      // Combine all tokens from users and employees
      allFcmTokens = [
        ...UserData.map((u: any) => u.fcmToken),
        ...employeeData.map((e: any) => e.fcmToken),
      ];

      await Promise.all(
        allFcmTokens.map(async (fcmToken: string) => {
          if (!fcmToken) {
            return; // Skip this iteration if the token is empty
          }

          const pushRes: any = await sendPushNotification(
            fcmToken,
            title || "Test Notification",
            body || "This is a test message, Take care.",
            image
          );


        })
      );

      await pushNotification.create({
        sendBy,
        title,
        body,
        sendTo,
        isSendToAll,
        image,
      });

    } else {
      // Loop over each entry in sendTo array
      for (const recipient of sendTo) {
        // Support both old format { id, roleId } and new UI format { userId, employeeId }
        // Also preserve roleId and name fields for additional info
        const { id, roleId, userId, employeeId, name } = recipient;
        
        let targetId, targetRoleId;
        
        if (userId !== undefined) {
          // New UI format: { userId } or { employeeId }
          targetId = userId || employeeId;
          targetRoleId = userId ? 1 : 3; // Default roleId: 1 for users, 3 for employees
        } else {
          // Old format: { id, roleId }
          targetId = id;
          targetRoleId = roleId;
        }

        // Fetch user data based on the targetId and targetRoleId
        const UserData: any = await users.findAll({
          where: { id: targetId, roleId: targetRoleId },
          attributes: ["fcmToken"],
        });

        if (UserData.length > 0) {
          // If user is found, collect their FCM tokens
          allFcmTokens.push(...UserData.map((u: any) => u.fcmToken));
        } else {
          // If no user is found, fetch employee data based on the targetId
          const employeeData: any = await employee.findAll({
            where: { id: targetId },
            attributes: ["fcmToken"],
          });

          if (employeeData.length > 0) {
            // If employee is found, collect their FCM tokens
            allFcmTokens.push(...employeeData.map((e: any) => e.fcmToken));
          }
        }
      }

      await Promise.all(
        allFcmTokens.map(async (fcmToken: string) => {
          if (!fcmToken) {
            return; // Skip this iteration if the token is empty
          }

          const pushRes: any = await sendPushNotification(
            fcmToken,
            title || "Test Notification",
            body || "This is a test message, Take care.",
            image
          );
        })
      );

      // Create only ONE notification entry for selected users
      await pushNotification.create({
        sendBy,
        title,
        body,
        sendTo,
        isSendToAll,
        image,
      });

    }

    // Send the push notification to all collected FCM tokens


  };

  public getAllPushNotifications = async (data: any): Promise<any> => {
    return await pushNotification.findAndCountAll({
      attributes: { exclude: ["deletedAt", "updatedAt"] },
      order: [["createdAt", "DESC"]],
      include: [
        {
          as: "admin",
          model: admin,
          attributes: ["id", "name", "adminRoleId"],
        },
      ],
    });
  };

  public getAllCombineUsers = async (data: any): Promise<any> => {
    const { name, filters } = data;

    // Build where conditions for users
    const userWhereConditions: any = {};
    const roleDataWhereConditions: any = {};
    const employeeWhereConditions: any = {};

    // 1. Filter by roleId (Individual: 1, Company: 2, Employee: 3)
    if (filters?.roleId) {
      const roleIds = filters.roleId.split(',').map((id: string) => parseInt(id.trim()));
      if (roleIds.includes(3)) {
        // If employee role is selected, we'll handle employees separately
        userWhereConditions.roleId = { [Op.in]: roleIds.filter((id: number) => id !== 3) };
        if (userWhereConditions.roleId[Op.in].length === 0) {
          delete userWhereConditions.roleId;
        }
      } else {
        userWhereConditions.roleId = { [Op.in]: roleIds };
      }
    }

    // 2. Filter by accountStatus (Available for Chat: 1, Not Available: 2, Suspended: 3, Muted: 4)
    if (filters?.accountStatus) {
      const accountStatuses = filters.accountStatus.split(',').map((status: string) => parseInt(status.trim()));
      roleDataWhereConditions.accountStatus = { [Op.in]: accountStatuses };
    }

    // 3. Filter by profileStatus (Approved: 3, Pending Approval: 2)
    if (filters?.profileStatus) {
      const profileStatuses = filters.profileStatus.split(',').map((status: string) => parseInt(status.trim()));
      userWhereConditions.profileStatus = { [Op.in]: profileStatuses };
    }

    // 4. Filter by current month registration
    if (filters?.currentMonth) {
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      userWhereConditions.createdAt = {
        [Op.between]: [startOfMonth, endOfMonth]
      };
    }

    // 5. Filter by lastLogin (today, week, month, quarter)
    if (filters?.lastLogin) {
      const now = new Date();
      let startDate: Date;
      
      switch (filters.lastLogin) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
          break;
        default:
          startDate = new Date(0);
      }
      
      userWhereConditions.lastLogin = {
        [Op.gte]: startDate
      };
    }

    // 6. Filter by industryId
    if (filters?.industryId) {
      const industryIds = filters.industryId.split(',').map((id: string) => parseInt(id.trim()));
      roleDataWhereConditions.industryId = { [Op.in]: industryIds };
    }

    // 7. Search by display name (using the getDisplayName logic)
    let searchTerm = null;
    if (name) {
      searchTerm = `%${name}%`;
    }
    if (filters?.userName) {
      searchTerm = `%${filters.userName}%`;
    }

    if (searchTerm) {
      roleDataWhereConditions[Op.or] = [
        { firstName: { [Op.like]: searchTerm } },
        { lastName: { [Op.like]: searchTerm } },
        { companyName: { [Op.like]: searchTerm } }
      ];
    }

    // Fetch users data
    const userData: any = await users.findAndCountAll({
      attributes: ["id", "roleId", "name", "profileStatus", "lastLogin", "createdAt"],
      where: userWhereConditions,
      order: [["createdAt", "DESC"]],
      include: [
        {
          as: "roleData",
          model: roleData,
          attributes: ["id", "firstName", "lastName", "profile", "companyName", "accountStatus", "industryId"],
          where: Object.keys(roleDataWhereConditions).length > 0 ? roleDataWhereConditions : undefined,
        },
      ],
    });

    // Fetch employee data
    let empData: any = { rows: [] };
    const shouldFetchEmployees = !filters?.roleId || filters.roleId.includes('3');
    
    if (shouldFetchEmployees) {
      // Apply same filters to employees where applicable
      const empUserWhereConditions: any = {};
      const empRoleDataWhereConditions: any = {};

      // Copy relevant filters for employees
      if (filters?.accountStatus) {
        const accountStatuses = filters.accountStatus.split(',').map((status: string) => parseInt(status.trim()));
        empRoleDataWhereConditions.accountStatus = { [Op.in]: accountStatuses };
      }

      if (filters?.currentMonth) {
        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        empUserWhereConditions.createdAt = {
          [Op.between]: [startOfMonth, endOfMonth]
        };
      }

      if (filters?.lastLogin) {
        const now = new Date();
        let startDate: Date;
        
        switch (filters.lastLogin) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
            startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
            break;
          default:
            startDate = new Date(0);
        }
        
        empUserWhereConditions.lastLogin = {
          [Op.gte]: startDate
        };
      }

      if (filters?.industryId) {
        const industryIds = filters.industryId.split(',').map((id: string) => parseInt(id.trim()));
        empRoleDataWhereConditions.industryId = { [Op.in]: industryIds };
      }

      if (searchTerm) {
        employeeWhereConditions[Op.or] = [
          { firstName: { [Op.like]: searchTerm } },
          { lastName: { [Op.like]: searchTerm } }
        ];
      }

      empData = await employee.findAndCountAll({
        attributes: ["id", "firstName", "lastName", "profile", "createdAt"],
        where: employeeWhereConditions,
      order: [["createdAt", "DESC"]],
      include: [
        {
          as: "users",
          model: users,
            attributes: ["id", "roleId", "name", "lastLogin", "createdAt"],
            where: Object.keys(empUserWhereConditions).length > 0 ? empUserWhereConditions : undefined,
          include: [
            {
              as: "roleData",
              model: roleData,
                attributes: ["id", "firstName", "lastName", "profile", "companyName", "accountStatus", "industryId"],
                where: Object.keys(empRoleDataWhereConditions).length > 0 ? empRoleDataWhereConditions : undefined,
            },
          ],
        },
      ],
    });
    }

    // Combine users and employee data into a unified structure
    const combinedData = [
      // Individual and Company users (roleId 1, 2)
      ...userData.rows.map((user: any) => ({
        id: user.id,
        roleId: user.roleId,
        username: user.name || "",
        roleData: {
          profile: user.roleData?.profile || "",
        firstName: user.roleData?.firstName || "",
        lastName: user.roleData?.lastName || "",
        companyName: user.roleData?.companyName || "",
        },
      })),
      // Employee users (roleId 3)
      ...empData.rows.map((emp: any) => ({
        id: emp.id,
        roleId: 3,
        username: emp.users?.name || "",
        profile: emp.profile || "",
        firstName: emp.firstName || "",
        lastName: emp.lastName || "",
      })),
    ];

    return combinedData;
  };

  public readAllNotification = async (data: any): Promise<any> => {
    const { notificationId } = data;

    await userNotification.update(
      { seen: true },
      {
        where: {
          id: notificationId,
        },
      }
    );
  };

  public submitAppeal = async (data: any): Promise<any> => {
    const { userId, appealMessage, roleId } = data;

    console.log(`[DEBUG] SubmitAppeal - userId: ${userId}, roleId: ${roleId}, appealMessage: ${appealMessage?.substring(0, 50)}...`);

    switch (roleId) {
      case 1: // Individual users/entrepreneurs
      case 2: // Companies
        console.log(`[DEBUG] Processing ${roleId === 1 ? 'user' : 'company'} appeal`);
        const userExists = await users.findOne({
          where: { id: userId, deletedAt: null }
        });
        console.log(`[DEBUG] User lookup - Found: ${userExists ? 'Yes' : 'No'}`);
        
        if (!userExists) {
          throw new Error("User not found");
        }

        console.log(`[DEBUG] User ${userId} - Request roleId: ${roleId}, Database roleId: ${userExists.roleId}`);
        
        if (userExists.roleId !== roleId) {
          throw new Error(`Role ID mismatch. The provided roleId (${roleId}) does not match the user's actual role (${userExists.roleId}).`);
        }

        if (userExists.appealMessage) {
          throw new Error("You have already submitted an appeal. Please wait for admin review before submitting another one.");
        }

        await users.update(
          { 
            appealMessage: appealMessage,
            hasAppeal: true
          },
          { where: { id: userId } }
        );
        console.log(`[DEBUG] User/Company appeal updated successfully`);
        break;

      case 3: // Employees
        console.log(`[DEBUG] Processing employee appeal - Looking for employee with id: ${userId}`);
        const employeeExists = await employee.findOne({
          where: { id: userId, deletedAt: null }
        });
        console.log(`[DEBUG] Employee found:`, employeeExists ? `ID: ${employeeExists.id}` : 'Not found');
        if (!employeeExists) {
          throw new Error("Employee record not found");
        }

        if (employeeExists.appealMessage) {
          throw new Error("You have already submitted an appeal. Please wait for admin review before submitting another one.");
        }

        await employee.update(
          { 
            appealMessage: appealMessage, 
            hasAppeal: true
          },
          { where: { id: employeeExists.id } }
        );
        console.log(`[DEBUG] Employee appeal updated successfully`);
        break;

      default:
        throw new Error(`Invalid role ID: ${roleId}. Supported roles are 1 (users), 2 (companies), and 3 (employees).`);
    }

    console.log(`[DEBUG] Appeal submitted successfully for ${roleId === 1 ? 'user' : roleId === 2 ? 'company' : 'employee'}`);
    return {
      message: "Appeal submitted successfully"
    };
  };

  /**
   * User Self-Delete - CASCADE deletes all user data
   * Admin has 90 days to restore
   */
  public deleteAccount = async (
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    const { id: userId, roleId } = data;
    const deletedAt = new Date();

    if ([1, 2].includes(roleId)) {
      // Mark user as self-deleted
      await users.update(
        { 
          deletedAt,
          deletedBy: null, // Self-delete
          deletionType: 'self'
        },
        { where: { id: userId }, transaction }
      );
      
      // CASCADE: Soft delete all related data
      await roleData.update({ deletedAt }, { where: { userId }, transaction });
      await userLog.update({ deletedAt }, { where: { userId }, transaction });
      await threads.update({ deletedAt }, { where: { ownerId: userId, roleId }, transaction });
      await messages.update({ deletedAt }, { where: { userId }, transaction });
      await privateThreads.update({ deletedAt }, { 
        where: { 
          [Op.or]: [
            { ownerUserId: userId },
            { toUserId: userId }
          ]
        }, 
        transaction 
      });
      await privateMessages.update({ deletedAt }, { where: { userId }, transaction });
      await userNotification.update({ deletedAt }, { where: { userId }, transaction });
      // Note: like table doesn't support soft delete, so we hard delete instead
      await like.destroy({ 
        where: { 
          [Op.or]: [
            { userWhoLikeId: userId },
            { toLikeId: userId }
          ]
        }, 
        transaction 
      });
      await toxicityScores.update({ deletedAt }, { where: { userId }, transaction });
      await report.update({ deletedAt }, { 
        where: { 
          [Op.or]: [
            { userId: userId },
            { reportedUserId: userId }
          ]
        }, 
        transaction 
      });
      
      // For companies (roleId = 2), also delete all employees
      if (roleId === 2) {
        const companyEmployees = await employee.findAll({
          where: { userId, deletedAt: null },
          attributes: ['id'],
          raw: true
        });

        for (const emp of companyEmployees) {
          await employee.update({ deletedAt, deletionType: 'self' }, { where: { id: emp.id }, transaction });
          await userLog.update({ deletedAt }, { where: { employeeId: emp.id }, transaction });
          await threads.update({ deletedAt }, { where: { ownerEmpId: emp.id, roleId: 3 }, transaction });
          await messages.update({ deletedAt }, { where: { empId: emp.id }, transaction });
          await privateMessages.update({ deletedAt }, { where: { empId: emp.id }, transaction });
          await userNotification.update({ deletedAt }, { where: { employeeId: emp.id }, transaction });
        }
      }
    }

    // Employee self-delete
    if ([3].includes(roleId)) {
      await employee.update(
        { 
          deletedAt,
          deletedBy: null,
          deletionType: 'self'
        },
        { where: { id: userId }, transaction }
      );
      
      // CASCADE: Delete all employee data
      await userLog.update({ deletedAt }, { where: { employeeId: userId }, transaction });
      await threads.update({ deletedAt }, { where: { ownerEmpId: userId, roleId: 3 }, transaction });
      await messages.update({ deletedAt }, { where: { empId: userId }, transaction });
      await privateThreads.update({ deletedAt }, { 
        where: { 
          [Op.or]: [
            { ownerEmpId: userId },
            { toEmpId: userId }
          ]
        }, 
        transaction 
      });
      await privateMessages.update({ deletedAt }, { where: { empId: userId }, transaction });
      await userNotification.update({ deletedAt }, { where: { employeeId: userId }, transaction });
      // Note: like table doesn't support soft delete, so we hard delete instead
      await like.destroy({ 
        where: { 
          [Op.or]: [
            { employeeWhoLikeId: userId },
            { employeeToLikeId: userId }
          ]
        }, 
        transaction 
      });
      await report.update({ deletedAt }, { 
        where: { 
          [Op.or]: [
            { userId: userId, roleId: 3 },
            { reportedUserId: userId, reportedRoleId: 3 }
          ]
        }, 
        transaction 
      });
    }

    return;
  };
}

const generateOTP = () => {
  return (Math.floor(Math.random() * 900000) + 100000).toString().slice(-6);
};

const isWithinTimeLimit = (timestamp: any, minutes: any) => {
  const expirationTime = new Date(timestamp);
  expirationTime.setMinutes(expirationTime.getMinutes() + minutes);
  return new Date() < expirationTime;
};

const calculateRemainingTime = (timestamp: any, minutes: any) => {
  const expirationTime: any = new Date(timestamp);
  expirationTime.setMinutes(expirationTime.getMinutes() + minutes);
  const nowTime: any = new Date();
  const remainingTime: any = expirationTime - nowTime;

  const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
  const minutesLeft = Math.floor(
    (remainingTime % (1000 * 60 * 60)) / (1000 * 60)
  );

  return `${minutesLeft} minute(s) and ${seconds} second(s)`;
};

const formatUserRecord = (userData: any, roleId: number) => {
  console.log("userDat", userData);

  if (roleId === 1) {
    return `${userData.firstName} ${userData.lastName}(Freelancer)`;
  } else if (roleId === 2) {
    return `${userData.companyName}(Company)`;
  }
};

const generateRandomName = () => {
  const rawUsername = faker.internet.username(); // Might include non-alphanumeric characters
  // const alphanumericUsername = rawUsername.replace(/[^0-9]/g, ''); // Remove anything that's not a-z, A-Z, or 0-9
  const randomNumber = Math.floor(1000 + Math.random() * 9000);
  return `bossie_${randomNumber}`;
}
