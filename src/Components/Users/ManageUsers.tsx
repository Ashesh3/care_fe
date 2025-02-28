import * as Notification from "../../Utils/Notifications.js";
import {
  addUserFacility,
  clearHomeFacility,
  deleteUser,
  deleteUserFacility,
  getDistrict,
  getUserList,
  getUserListFacility,
  partialUpdateUser,
} from "../../Redux/actions";
import { statusType, useAbortableEffect } from "../../Common/utils";
import { lazy, useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { AdvancedFilterButton } from "../../CAREUI/interactive/FiltersSlideover";
import ButtonV2, { Submit } from "../Common/components/ButtonV2";
import CareIcon from "../../CAREUI/icons/CareIcon";
import ConfirmHomeFacilityUpdateDialog from "./ConfirmHomeFacilityUpdateDialog";
import CountBlock from "../../CAREUI/display/Count";
import { FacilityModel } from "../Facility/models";
import { FacilitySelect } from "../Common/FacilitySelect";
import SearchInput from "../Form/SearchInput";
import SkillsSlideOver from "./SkillsSlideOver";
import SlideOverCustom from "../../CAREUI/interactive/SlideOver";
import { USER_TYPES } from "../../Common/constants";
import UnlinkFacilityDialog from "./UnlinkFacilityDialog";
import UserDeleteDialog from "./UserDeleteDialog";
import UserDetails from "../Common/UserDetails";
import UserFilter from "./UserFilter";
import { classNames, isUserOnline, relativeTime } from "../../Utils/utils";
import { navigate } from "raviger";
import useFilters from "../../Common/hooks/useFilters";
import useWindowDimensions from "../../Common/hooks/useWindowDimensions";
import CircularProgress from "../Common/components/CircularProgress.js";
import Page from "../Common/components/Page.js";
import dayjs from "dayjs";
import TextFormField from "../Form/FormFields/TextFormField.js";
import useAuthUser from "../../Common/hooks/useAuthUser.js";

const Loading = lazy(() => import("../Common/Loading"));

export default function ManageUsers() {
  const { width } = useWindowDimensions();
  const {
    qParams,
    updateQuery,
    Pagination,
    FilterBadges,
    advancedFilter,
    resultsPerPage,
  } = useFilters({ limit: 18 });
  const dispatch: any = useDispatch();
  const initialData: any[] = [];
  let manageUsers: any = null;
  const [users, setUsers] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [expandSkillList, setExpandSkillList] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [districtName, setDistrictName] = useState<string>();
  const [expandFacilityList, setExpandFacilityList] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [expandWorkingHours, setExpandWorkingHours] = useState(false);
  const authUser = useAuthUser();
  const [weeklyHours, setWeeklyHours] = useState<any>(0);
  const userIndex = USER_TYPES.indexOf(authUser.user_type);
  const userTypes = authUser.is_superuser
    ? [...USER_TYPES]
    : USER_TYPES.slice(0, userIndex + 1);

  const [userData, setUserData] = useState<{
    show: boolean;
    username: string;
    name: string;
  }>({ show: false, username: "", name: "" });

  const [weeklyHoursError, setWeeklyHoursError] = useState<string>("");

  const extremeSmallScreenBreakpoint = 320;
  const isExtremeSmallScreen =
    width <= extremeSmallScreenBreakpoint ? true : false;

  const fetchData = useCallback(
    async (status: statusType) => {
      setIsLoading(true);
      const params = {
        limit: resultsPerPage,
        offset: (qParams.page ? qParams.page - 1 : 0) * resultsPerPage,
        username: qParams.username,
        first_name: qParams.first_name,
        last_name: qParams.last_name,
        phone_number: qParams.phone_number,
        alt_phone_number: qParams.alt_phone_number,
        user_type: qParams.user_type,
        district_id: qParams.district_id,
      };
      if (qParams.district_id) {
        const dis = await dispatch(getDistrict(qParams.district_id));
        if (!status.aborted) {
          if (dis && dis.data) {
            setDistrictName(dis.data.name);
          }
        }
      } else {
        setDistrictName(undefined);
      }
      const res = await dispatch(getUserList(params));
      if (!status.aborted) {
        if (res && res.data) {
          setUsers(res.data.results);
          setTotalCount(res.data.count);
        }
        setIsLoading(false);
      }
    },
    [
      resultsPerPage,
      qParams.page,
      qParams.username,
      qParams.first_name,
      qParams.last_name,
      qParams.phone_number,
      qParams.alt_phone_number,
      qParams.user_type,
      qParams.district_id,
      dispatch,
    ]
  );

  useAbortableEffect(
    (status: statusType) => {
      fetchData(status);
    },
    [fetchData]
  );

  const addUser = (
    <ButtonV2 className="w-full" onClick={() => navigate("/users/add")}>
      <CareIcon className="care-l-plus w-full text-lg" />
      <p>Add New User</p>
    </ButtonV2>
  );

  const handleCancel = () => {
    setUserData({ show: false, username: "", name: "" });
  };

  const handleWorkingHourSubmit = async () => {
    const username = selectedUser;
    if (!username || !weeklyHours || weeklyHours < 0 || weeklyHours > 168) {
      setWeeklyHoursError("Value should be between 0 and 168");
      return;
    }
    const res = await dispatch(
      partialUpdateUser(username, {
        weekly_working_hours: weeklyHours,
      })
    );

    if (res?.data) {
      Notification.Success({
        msg: "Working hours updated successfully",
      });
      setExpandWorkingHours(false);
      setSelectedUser(null);
    } else {
      Notification.Error({
        msg: "Error while updating working hours: " + (res.data.detail || ""),
      });
    }
    setWeeklyHours(0);
    setWeeklyHoursError("");
    fetchData({ aborted: false });
  };

  const handleSubmit = async () => {
    const username = userData.username;
    const res = await dispatch(deleteUser(username));
    if (res?.status === 204) {
      Notification.Success({
        msg: "User deleted successfully",
      });
    } else {
      Notification.Error({
        msg: "Error while deleting User: " + (res?.data?.detail || ""),
      });
    }

    setUserData({ show: false, username: "", name: "" });
    fetchData({ aborted: false });
  };

  const handleDelete = (user: any) => {
    setUserData({
      show: true,
      username: user.username,
      name: `${user.first_name} ${user.last_name}`,
    });
  };

  const showDelete = (user: any) => {
    if (user.is_superuser) return true;

    if (
      USER_TYPES.indexOf(authUser.user_type) >= USER_TYPES.indexOf("StateAdmin")
    )
      return user.state_object?.id === authUser.state;

    return false;
  };

  let userList: any[] = [];

  users &&
    users.length &&
    (userList = users.map((user: any, idx) => {
      const cur_online = isUserOnline(user);
      return (
        <div
          key={`usr_${user.id}`}
          id={`usr_${idx}`}
          className=" mt-6 w-full md:px-4 lg:w-1/2 xl:w-1/3"
        >
          <div className="relative block h-full overflow-visible rounded-lg bg-white shadow hover:border-primary-500">
            <div className="flex h-full flex-col justify-between @container">
              <div className="px-6 py-4">
                <div
                  className="flex flex-col
                flex-wrap justify-between gap-3 @sm:flex-row"
                >
                  {user.username && (
                    <div
                      id="username"
                      className="inline-flex w-fit items-center rounded-md bg-blue-100 px-2.5 py-0.5 text-sm font-medium leading-5 text-blue-800"
                    >
                      {user.username}
                    </div>
                  )}
                  <div className="min-width-50 shrink-0 text-sm text-gray-600">
                    {user.last_login && cur_online ? (
                      <span>
                        {" "}
                        <i className="fa-solid fa-clock"></i> Currently Online
                      </span>
                    ) : (
                      <>
                        <span>
                          <i className="fa-solid fa-clock"></i> Last Online:{" "}
                        </span>
                        <span
                          aria-label="Online"
                          className={classNames(
                            "inline-block h-2 w-2 shrink-0 rounded-full",
                            cur_online ? "bg-primary-400" : "bg-gray-300"
                          )}
                        ></span>
                        <span className="pl-2">
                          {user.last_login
                            ? relativeTime(user.last_login)
                            : "Never"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div id="name" className="mt-2 text-2xl font-bold capitalize">
                  {`${user.first_name} ${user.last_name}`}

                  {user.last_login && cur_online ? (
                    <i
                      className="fas fa-circle ml-1 animate-pulse text-primary-500 opacity-75"
                      aria-label="Online"
                    ></i>
                  ) : null}
                  {showDelete(user) && (
                    <ButtonV2
                      variant="danger"
                      ghost
                      border
                      className="float-right"
                      onClick={() => handleDelete(user)}
                    >
                      Delete
                    </ButtonV2>
                  )}
                </div>

                <div
                  className={`flex ${
                    isExtremeSmallScreen
                      ? " flex-wrap "
                      : " flex-col justify-between md:flex-row "
                  } gap-2 md:grid md:grid-cols-2`}
                >
                  {user.user_type && (
                    <div className="col-span-1">
                      <UserDetails id="role" title="Role">
                        <div className="break-all font-semibold">
                          {user.user_type}
                        </div>
                      </UserDetails>
                    </div>
                  )}
                  {user.district_object && (
                    <div className="col-span-1">
                      <UserDetails id="district" title="District">
                        <div className="font-semibold">
                          {user.district_object.name}
                        </div>
                      </UserDetails>
                    </div>
                  )}
                  {user.user_type === "Doctor" && (
                    <>
                      <div className="col-span-1">
                        <UserDetails
                          id="doctor-qualification"
                          title="Qualification"
                        >
                          {user.doctor_qualification ? (
                            <span className="font-semibold">
                              {user.doctor_qualification}
                            </span>
                          ) : (
                            <span className="text-gray-600">Unknown</span>
                          )}
                        </UserDetails>
                      </div>
                      <div className="col-span-1">
                        <UserDetails id="doctor-experience" title="Experience">
                          {user.doctor_experience_commenced_on ? (
                            <span className="font-semibold">
                              {dayjs().diff(
                                user.doctor_experience_commenced_on,
                                "years",
                                false
                              )}{" "}
                              years
                            </span>
                          ) : (
                            <span className="text-gray-600">Unknown</span>
                          )}
                        </UserDetails>
                      </div>
                      <div className="col-span-2">
                        <UserDetails
                          id="medical-council-registration"
                          title="Medical Council Registration"
                        >
                          {user.doctor_medical_council_registration ? (
                            <span className="font-semibold">
                              {user.doctor_medical_council_registration}
                            </span>
                          ) : (
                            <span className="text-gray-600">Unknown</span>
                          )}
                        </UserDetails>
                      </div>
                    </>
                  )}
                </div>
                {user.local_body_object && (
                  <UserDetails id="local_body" title="Location">
                    <div className="font-semibold">
                      {user.local_body_object.name}
                    </div>
                  </UserDetails>
                )}
                <div
                  className={`${
                    isExtremeSmallScreen
                      ? "flex flex-wrap "
                      : "grid grid-cols-2 "
                  }`}
                >
                  {user.created_by && (
                    <div className="col-span-1">
                      <UserDetails id="created_by" title="Created by">
                        <div className="break-all font-semibold">
                          {user.created_by}
                        </div>
                      </UserDetails>
                    </div>
                  )}
                  {user.username && (
                    <div className="col-span-1">
                      <UserDetails id="home_facility" title="Home Facility">
                        <span className="block font-semibold">
                          {user.home_facility_object?.name ||
                            "No Home Facility"}
                        </span>
                      </UserDetails>
                    </div>
                  )}
                </div>
                <div>
                  <UserDetails
                    id="working-hours"
                    title="Average weekly working hours"
                  >
                    {user.weekly_working_hours ? (
                      <span className="font-semibold">
                        {user.weekly_working_hours} hours
                      </span>
                    ) : (
                      <span className="text-gray-600">-</span>
                    )}
                  </UserDetails>
                </div>
              </div>
              {user.username && (
                <div className="mb-0 mt-auto flex w-full flex-col justify-between gap-2 p-4">
                  <div className="flex flex-col gap-2 @sm:flex-row">
                    <ButtonV2
                      id="facilities"
                      className="flex w-full items-center @sm:w-1/2"
                      onClick={() => {
                        setExpandFacilityList(!expandFacilityList);
                        setSelectedUser(user);
                      }}
                    >
                      <CareIcon className="care-l-hospital text-lg" />
                      <p>Linked Facilities</p>
                    </ButtonV2>
                    <ButtonV2
                      id="skills"
                      className="flex w-full items-center @sm:w-1/2"
                      onClick={() => {
                        setExpandSkillList(true);
                        setSelectedUser(user.username);
                      }}
                    >
                      <CareIcon className="care-l-award text-xl" />
                      <p>Linked Skills</p>
                    </ButtonV2>
                  </div>
                  {["DistrictAdmin", "StateAdmin"].includes(
                    authUser.user_type
                  ) && (
                    <div className="flex-col md:flex-row">
                      <ButtonV2
                        id="skills"
                        className="flex w-full items-center md:w-full"
                        onClick={() => {
                          setExpandWorkingHours(true);
                          setSelectedUser(user.username);
                          setWeeklyHours(user.weekly_working_hours);
                        }}
                      >
                        <CareIcon className="care-l-clock text-xl" />
                        <p>Set Average weekly working hours</p>
                      </ButtonV2>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }));

  if (isLoading || !users) {
    manageUsers = <Loading />;
  } else if (users?.length) {
    manageUsers = (
      <div>
        <div className="flex flex-wrap md:-mx-4">{userList}</div>
        <Pagination totalCount={totalCount} />
      </div>
    );
  } else if (users && users.length === 0) {
    manageUsers = (
      <div>
        <h5> No Users Found</h5>
      </div>
    );
  }

  return (
    <Page title="User Management" hideBack={true} breadcrumbs={false}>
      {expandSkillList && (
        <SkillsSlideOver
          show={expandSkillList}
          setShow={setExpandSkillList}
          username={selectedUser}
        />
      )}
      <SlideOverCustom
        open={expandFacilityList}
        setOpen={setExpandFacilityList}
        slideFrom="right"
        title="Facilities"
        dialogClass="md:w-[400px]"
        onCloseClick={() => {
          //fetchData({ aborted: false });
        }}
      >
        <UserFacilities user={selectedUser} />
      </SlideOverCustom>
      <SlideOverCustom
        open={expandWorkingHours}
        setOpen={(state) => {
          setExpandWorkingHours(state);
          setWeeklyHours(0);
          setWeeklyHoursError("");
        }}
        slideFrom="right"
        title="Average weekly working hours"
        dialogClass="md:w-[400px]"
      >
        <div className="px-2">
          <dt className="mb-3 text-sm font-medium leading-5 text-black">
            Set Average weekly working hours for {selectedUser}
          </dt>
          <TextFormField
            name="weekly_working_hours"
            id="weekly_working_hours"
            value={weeklyHours}
            onChange={(e) => {
              setWeeklyHours(e.value);
            }}
            error={weeklyHoursError}
            required
            label=""
            type="number"
            min={0}
            max={168}
          />
          <div className="mt-2 text-right">
            <Submit onClick={handleWorkingHourSubmit} label="Update" />
          </div>
        </div>
      </SlideOverCustom>

      <div className="m-4 mt-5 grid grid-cols-1 sm:grid-cols-3 md:gap-5 md:px-2">
        <CountBlock
          text="Total Users"
          count={totalCount}
          loading={isLoading}
          icon="l-user-injured"
          className="flex-1"
        />
        <div className="col-span-2 my-2 flex flex-col justify-between space-y-3 lg:flex-row lg:space-x-4 lg:space-y-0 lg:px-3">
          <div className="w-full">
            <SearchInput
              id="search-by-username"
              name="username"
              onChange={(e) => updateQuery({ [e.name]: e.value })}
              value={qParams.username}
              placeholder="Search by username"
            />
          </div>
          <div className="flex flex-col gap-2">
            <AdvancedFilterButton
              onClick={() => advancedFilter.setShow(true)}
            />
            {userTypes.length && addUser}
          </div>

          <UserFilter {...advancedFilter} key={window.location.search} />
        </div>
      </div>

      <div className="pb-2 pl-6">
        <FilterBadges
          badges={({ badge, value, phoneNumber }) => [
            badge("Username", "username"),
            badge("First Name", "first_name"),
            badge("Last Name", "last_name"),
            phoneNumber(),
            phoneNumber("WhatsApp no.", "alt_phone_number"),
            badge("Role", "user_type"),
            value("District", "district_id", districtName || ""),
          ]}
        />
      </div>

      <div className="px-3 md:px-6">
        <div>{manageUsers}</div>
      </div>
      {userData.show && (
        <UserDeleteDialog
          name={userData.name}
          handleCancel={handleCancel}
          handleOk={handleSubmit}
        />
      )}
    </Page>
  );
}

function UserFacilities(props: { user: any }) {
  const { user } = props;
  const username = user.username;
  const dispatch: any = useDispatch();
  const [facilities, setFacilities] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [facility, setFacility] = useState<any>(null);
  const [unlinkFacilityData, setUnlinkFacilityData] = useState<{
    show: boolean;
    userName: string;
    facility?: FacilityModel;
    isHomeFacility: boolean;
  }>({ show: false, userName: "", facility: undefined, isHomeFacility: false });

  const [replaceHomeFacility, setReplaceHomeFacility] = useState<{
    show: boolean;
    userName: string;
    previousFacility?: FacilityModel;
    newFacility?: FacilityModel;
  }>({
    show: false,
    userName: "",
    previousFacility: undefined,
    newFacility: undefined,
  });
  const hideReplaceHomeFacilityModal = () => {
    setReplaceHomeFacility({
      show: false,
      previousFacility: undefined,
      userName: "",
      newFacility: undefined,
    });
  };
  const hideUnlinkFacilityModal = () => {
    setUnlinkFacilityData({
      show: false,
      facility: undefined,
      userName: "",
      isHomeFacility: false,
    });
  };

  const fetchFacilities = async () => {
    setIsLoading(true);
    const res = await dispatch(getUserListFacility({ username }));
    if (res && res.data) {
      setFacilities(res.data);
    }
    setIsLoading(false);
  };

  const updateHomeFacility = async (username: string, facility: any) => {
    setIsLoading(true);
    const res = await dispatch(
      partialUpdateUser(username, { home_facility: facility.id })
    );
    if (res && res.status === 200) user.home_facility_object = facility;
    fetchFacilities();
    setIsLoading(false);
  };

  const handleUnlinkFacilitySubmit = async () => {
    setIsLoading(true);
    if (unlinkFacilityData.isHomeFacility) {
      const res = await dispatch(
        clearHomeFacility(unlinkFacilityData.userName)
      );
      if (res && res.status === 204) user.home_facility_object = null;
    } else {
      await dispatch(
        deleteUserFacility(
          unlinkFacilityData.userName,
          String(unlinkFacilityData?.facility?.id)
        )
      );
    }
    fetchFacilities();
    setIsLoading(false);
    hideUnlinkFacilityModal();
  };

  const addFacility = async (username: string, facility: any) => {
    setIsLoading(true);
    const res = await dispatch(addUserFacility(username, String(facility.id)));
    if (res?.status !== 201) {
      Notification.Error({
        msg: "Error while linking facility",
      });
    }
    setIsLoading(false);
    setFacility(null);
    fetchFacilities();
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  return (
    <div className="h-full">
      {unlinkFacilityData.show && (
        <UnlinkFacilityDialog
          facilityName={unlinkFacilityData.facility?.name || ""}
          userName={unlinkFacilityData.userName}
          isHomeFacility={unlinkFacilityData.isHomeFacility}
          handleCancel={hideUnlinkFacilityModal}
          handleOk={handleUnlinkFacilitySubmit}
        />
      )}
      <div className="mb-4 flex items-stretch gap-2">
        <FacilitySelect
          multiple={false}
          name="facility"
          showAll={false} // Show only facilities that user has access to link (not all facilities)
          showNOptions={8}
          selected={facility}
          setSelected={setFacility}
          errors=""
          className="z-40"
        />
        <ButtonV2
          id="link-facility"
          disabled={!facility}
          className="mt-1"
          onClick={() => addFacility(username, facility)}
        >
          Add
        </ButtonV2>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center">
          <CircularProgress />
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Home Facility section */}
          {user?.home_facility_object && (
            <div className="mt-2">
              <div className="mb-2 ml-2 text-lg font-bold">Home Facility</div>
              <div className="relative rounded p-2 transition hover:bg-gray-200 focus:bg-gray-200 md:rounded-lg">
                <div className="flex items-center justify-between">
                  <span>{user?.home_facility_object?.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      className="tooltip text-lg text-red-600"
                      onClick={() =>
                        setUnlinkFacilityData({
                          show: true,
                          facility: user?.home_facility_object,
                          userName: username,
                          isHomeFacility: true,
                        })
                      }
                    >
                      <CareIcon className="care-l-link-broken" />
                      <span className="tooltip-text tooltip-left">
                        Clear Home Facility
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              <hr className="my-2 border-gray-300" />
            </div>
          )}

          {/* Linked Facilities section */}
          {facilities.length > 0 && (
            <div className="mt-2">
              <div className="mb-2 ml-2 text-lg font-bold">
                Linked Facilities
              </div>
              <div className="flex flex-col">
                {facilities.map((facility: any, i: number) => {
                  if (user?.home_facility_object?.id === facility.id) {
                    // skip if it's a home facility
                    return null;
                  }
                  return (
                    <div
                      id={`facility_${i}`}
                      key={`facility_${i}`}
                      className={classNames(
                        "relative rounded p-2 transition hover:bg-gray-200 focus:bg-gray-200 md:rounded-lg"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span>{facility.name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            className="tooltip text-lg hover:text-primary-500"
                            onClick={() => {
                              if (user?.home_facility_object) {
                                // has previous home facility
                                setReplaceHomeFacility({
                                  show: true,
                                  userName: username,
                                  previousFacility: user?.home_facility_object,
                                  newFacility: facility,
                                });
                              } else {
                                // no previous home facility
                                updateHomeFacility(username, facility);
                              }
                            }}
                          >
                            <CareIcon className="care-l-estate" />
                            <span className="tooltip-text tooltip-left">
                              Set as home facility
                            </span>
                          </button>
                          <button
                            className="tooltip text-lg text-red-600"
                            onClick={() =>
                              setUnlinkFacilityData({
                                show: true,
                                facility: facility,
                                userName: username,
                                isHomeFacility: false,
                              })
                            }
                          >
                            <CareIcon className="care-l-link-broken" />
                            <span className="tooltip-text tooltip-left">
                              Unlink Facility
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {!user?.home_facility_object && facilities.length === 0 && (
            <div className="my-2 flex h-96 flex-col content-center justify-center align-middle">
              <div className="w-full">
                <img
                  src="/images/404.svg"
                  alt="No linked facilities"
                  className="mx-auto w-80"
                />
              </div>
              <p className="pt-4 text-center text-lg font-semibold text-primary">
                No Linked Facilities
              </p>
            </div>
          )}
        </div>
      )}
      {replaceHomeFacility.show && (
        <ConfirmHomeFacilityUpdateDialog
          previousFacilityName={
            replaceHomeFacility.previousFacility?.name || ""
          }
          userName={replaceHomeFacility.userName}
          newFacilityName={replaceHomeFacility.newFacility?.name || ""}
          handleCancel={hideReplaceHomeFacilityModal}
          handleOk={() => {
            updateHomeFacility(
              replaceHomeFacility.userName,
              replaceHomeFacility.newFacility
            );
            setReplaceHomeFacility({
              show: false,
              previousFacility: undefined,
              userName: "",
              newFacility: undefined,
            });
          }}
        />
      )}
    </div>
  );
}
