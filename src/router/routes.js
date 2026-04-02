import MainLayout from '../layout/MainLayout.vue'
import ForbiddenView from '../views/error/ForbiddenView.vue'
import LoginView from '../views/login/LoginView.vue'
import ModulePlaceholderView from '../views/placeholder/ModulePlaceholderView.vue'
import { buildMenuGroups } from './access'

export const protectedChildRoutes = [
  {
    path: 'dashboard',
    name: 'dashboard',
    component: ModulePlaceholderView,
    meta: {
      requiresAuth: true,
      title: '概览工作台',
      menuGroup: '工作台',
      roles: ['ADMIN', 'EMPLOYEE'],
      moduleCode: 'FE-02',
    },
  },
  {
    path: 'statistics',
    name: 'statistics',
    component: ModulePlaceholderView,
    meta: {
      requiresAuth: true,
      title: '统计分析',
      menuGroup: '工作台',
      roles: ['ADMIN'],
      moduleCode: 'FE-02',
    },
  },
  {
    path: 'user',
    name: 'user',
    component: ModulePlaceholderView,
    meta: {
      requiresAuth: true,
      title: '用户管理',
      menuGroup: '基础资料',
      roles: ['ADMIN'],
      moduleCode: 'FE-03',
    },
  },
  {
    path: 'department',
    name: 'department',
    component: ModulePlaceholderView,
    meta: {
      requiresAuth: true,
      title: '部门管理',
      menuGroup: '基础资料',
      roles: ['ADMIN'],
      moduleCode: 'FE-03',
    },
  },
  {
    path: 'system/role',
    name: 'system-role',
    component: ModulePlaceholderView,
    meta: {
      requiresAuth: true,
      title: '角色管理',
      menuGroup: '基础资料',
      roles: ['ADMIN'],
      moduleCode: 'FE-03',
    },
  },
  {
    path: 'face',
    name: 'face',
    component: ModulePlaceholderView,
    meta: {
      requiresAuth: true,
      title: '人脸采集',
      menuGroup: '考勤业务',
      roles: ['EMPLOYEE'],
      moduleCode: 'FE-04',
    },
  },
  {
    path: 'attendance',
    name: 'attendance',
    component: ModulePlaceholderView,
    meta: {
      requiresAuth: true,
      title: '考勤记录',
      menuGroup: '考勤业务',
      roles: ['ADMIN', 'EMPLOYEE'],
      moduleCode: 'FE-05',
    },
  },
  {
    path: 'exception',
    name: 'exception',
    component: ModulePlaceholderView,
    meta: {
      requiresAuth: true,
      title: '异常中心',
      menuGroup: '风险与系统',
      roles: ['ADMIN'],
      moduleCode: 'FE-06',
    },
  },
  {
    path: 'warning',
    name: 'warning',
    component: ModulePlaceholderView,
    meta: {
      requiresAuth: true,
      title: '预警列表',
      menuGroup: '风险与系统',
      roles: ['ADMIN'],
      moduleCode: 'FE-06',
    },
  },
  {
    path: 'review',
    name: 'review',
    component: ModulePlaceholderView,
    meta: {
      requiresAuth: true,
      title: '人工复核',
      menuGroup: '风险与系统',
      roles: ['ADMIN'],
      moduleCode: 'FE-07',
    },
  },
  {
    path: 'system',
    name: 'system',
    component: ModulePlaceholderView,
    meta: {
      requiresAuth: true,
      title: '系统配置',
      menuGroup: '风险与系统',
      roles: ['ADMIN'],
      moduleCode: 'FE-08',
    },
  },
]

export function getMenuGroups(routes, roleCode) {
  return buildMenuGroups(routes, roleCode)
}

export const appRoutes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: {
      title: '登录',
      hidden: true,
    },
  },
  {
    path: '/',
    component: MainLayout,
    meta: {
      requiresAuth: true,
      hidden: true,
    },
    children: protectedChildRoutes,
  },
  {
    path: '/403',
    name: 'forbidden',
    component: ForbiddenView,
    meta: {
      requiresAuth: true,
      hidden: true,
      title: '无权限访问',
      roles: ['ADMIN', 'EMPLOYEE'],
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]
